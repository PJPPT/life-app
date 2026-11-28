let data = JSON.parse(localStorage.getItem('lifeOSData')) || {
  water: 0,
  cycleStatus: 'Follicular Phase',
  periodDates: [],
  periodHidden: false,
  todos: [],
  scratchpad: '',
  schedules: [],
  books: [],
  shows: [],
  stocks: [],
  projects: [],
  awards: [],
  goals: [],
  wishes: []
};

if (!data.stocks) data.stocks = [];
if (!data.awards) data.awards = [];
if (typeof data.periodHidden === 'undefined') data.periodHidden = false;

let currentCalDate = new Date();
let openSummaries = {};
let openFolders = {};
let editingBookIndex = null;
let editingShowIndex = null;

function saveData() {
  localStorage.setItem('lifeOSData', JSON.stringify(data));
  renderAll();
}

// Navigation
function switchTab(tabName, btn) {
  document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');
  btn.classList.add('active');
  btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

function switchMediaSub(subName, btn) {
  document.querySelectorAll('.media-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('media-' + subName).classList.add('active');
  btn.classList.add('active');
}

// Toggle conditional schedule fields
function toggleSchedFields() {
  const type = document.getElementById('sched-type').value;
  const recurrence = document.getElementById('sched-recurrence').value;
  
  const isEvent = (type === 'Event');
  document.getElementById('date-field-container').style.display = isEvent ? 'block' : 'none';
  document.getElementById('recurrence-field-container').style.display = isEvent ? 'none' : 'block';
  document.getElementById('days-field-container').style.display = (!isEvent && recurrence === 'Custom Days') ? 'flex' : 'none';
  document.getElementById('monthly-field-container').style.display = (!isEvent && recurrence === 'Monthly') ? 'flex' : 'none';
}

// Toggle conditional series fields for Books & Shows
function toggleMediaSeriesFields(prefix) {
  const isSeries = document.getElementById(`${prefix}-is-series`).checked;
  const container = document.getElementById(`${prefix}-series-container`);
  container.style.display = isSeries ? 'block' : 'none';
  if (isSeries) {
    toggleNewSeriesInput(prefix);
  }
}

function toggleNewSeriesInput(prefix) {
  const selectVal = document.getElementById(`${prefix}-series-select`).value;
  const newInput = document.getElementById(`${prefix}-series-new`);
  newInput.style.display = (selectVal === '__new__') ? 'block' : 'none';
}

function toggleEntireSeries(prefix) {
  const isEntire = document.getElementById(`${prefix}-entire-series`).checked;
  document.getElementById(`${prefix}-single-fields`).style.display = isEntire ? 'none' : 'block';
  document.getElementById(`${prefix}-series-only-field`).style.display = isEntire ? 'block' : 'none';
}

function toggleSummaryField(prefix) {
  const status = document.getElementById(`${prefix}-status`).value;
  const sumField = document.getElementById(`${prefix}-summary`);
  sumField.style.display = (status === 'Finished') ? 'block' : 'none';
}

function populateSeriesDropdowns() {
  const bookSeriesList = [...new Set(data.books.map(b => b.series).filter(Boolean))];
  const bookSelect = document.getElementById('book-series-select');
  const prevBookVal = bookSelect.value;
  bookSelect.innerHTML = bookSeriesList.map(s => `<option value="${s.replace(/"/g, '"')}">${s}</option>`).join('') +
    `<option value="__new__">+ Add New Series</option>`;
  if (bookSeriesList.includes(prevBookVal)) bookSelect.value = prevBookVal;
  else if (bookSeriesList.length > 0 && prevBookVal !== '__new__') bookSelect.value = bookSeriesList[0];
  else bookSelect.value = '__new__';
  toggleNewSeriesInput('book');

  const showSeriesList = [...new Set(data.shows.map(s => s.series).filter(Boolean))];
  const showSelect = document.getElementById('show-series-select');
  const prevShowVal = showSelect.value;
  showSelect.innerHTML = showSeriesList.map(s => `<option value="${s.replace(/"/g, '"')}">${s}</option>`).join('') +
    `<option value="__new__">+ Add New Series</option>`;
  if (showSeriesList.includes(prevShowVal)) showSelect.value = prevShowVal;
  else if (showSeriesList.length > 0 && prevShowVal !== '__new__') showSelect.value = showSeriesList[0];
  else showSelect.value = '__new__';
  toggleNewSeriesInput('show');
}

// Health: Water & Cycle
function changeWater(amount) {
  data.water = Math.max(0, data.water + amount);
  saveData();
}
function resetWater() {
  data.water = 0;
  saveData();
}

function togglePeriodVisibility() {
  data.periodHidden = !data.periodHidden;
  saveData();
}

function updateCycleStatus() {
  data.cycleStatus = document.getElementById('cycle-status-select').value;
  saveData();
}

// Calendar Period Tracker & Predictor Logic
function changeMonth(direction) {
  currentCalDate.setMonth(currentCalDate.getMonth() + direction);
  renderCalendar();
}

function togglePeriodDate(dateString) {
  const index = data.periodDates.indexOf(dateString);
  if (index > -1) {
    data.periodDates.splice(index, 1);
  } else {
    data.periodDates.push(dateString);
  }
  data.periodDates.sort();
  saveData();
}

function getPredictedPeriodDate() {
  if (!data.periodDates || data.periodDates.length === 0) return null;
  const sorted = [...data.periodDates].sort();
  
  let cycleStartStr = sorted[sorted.length - 1];
  for (let i = sorted.length - 1; i > 0; i--) {
    const curr = new Date(sorted[i] + 'T00:00:00');
    const prev = new Date(sorted[i - 1] + 'T00:00:00');
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diffDays <= 2) {
      cycleStartStr = sorted[i - 1];
    } else {
      break;
    }
  }

  const startDate = new Date(cycleStartStr + 'T00:00:00');
  const nextDate = new Date(startDate);
  nextDate.setDate(startDate.getDate() + 28);
  return nextDate;
}

function renderCalendar() {
  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  document.getElementById('cal-month-title').textContent = `${monthNames[month]} ${year}`;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  let calHTML = '';
  for (let i = 0; i < firstDayIndex; i++) {
    calHTML += `<div class="cal-day empty"></div>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    
    const isPeriod = data.periodDates.includes(dateStr);
    calHTML += `<div class="cal-day ${isPeriod ? 'period' : ''}" onclick="togglePeriodDate('${dateStr}')">${day}</div>`;
  }

  document.getElementById('calendar-days').innerHTML = calHTML;
}

// Todos & Scratchpad
function addTodo() {
  const input = document.getElementById('todo-input');
  if (!input.value.trim()) return;
  data.todos.push({ text: input.value.trim(), done: false });
  input.value = '';
  saveData();
}
function toggleTodo(index) {
  data.todos[index].done = !data.todos[index].done;
  saveData();
}
function saveScratchpad() {
  data.scratchpad = document.getElementById('scratchpad').value;
  localStorage.setItem('lifeOSData', JSON.stringify(data));
}

// Helper to check if a schedule item happens on a specific Date object
function isScheduledForDate(item, targetDate) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayShort = dayNames[targetDate.getDay()];
  
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const targetDateStr = `${yyyy}-${mm}-${dd}`;

  if (item.type === 'Event' || item.date) {
    return item.date === targetDateStr;
  }

  if (item.recurrence === 'Everyday') {
    return true;
  }

  if (item.recurrence === 'Weekdays (Mon-Fri)') {
    return targetDate.getDay() >= 1 && targetDate.getDay() <= 5;
  }

  if (item.recurrence === 'Custom Days') {
    return Array.isArray(item.days) && item.days.includes(dayShort);
  }

  if (item.recurrence === 'Monthly') {
    if (item.monthlyDay !== dayShort) return false;
    const dateOfMonth = targetDate.getDate();
    if (item.monthlyWeek === 'last') {
      const nextWeek = new Date(targetDate);
      nextWeek.setDate(dateOfMonth + 7);
      return nextWeek.getMonth() !== targetDate.getMonth();
    } else {
      const nth = Math.ceil(dateOfMonth / 7);
      return nth === parseInt(item.monthlyWeek, 10);
    }
  }

  return false;
}

// Schedules & Events
function addScheduleItem() {
  const type = document.getElementById('sched-type').value;
  const name = document.getElementById('sched-name').value.trim();
  const date = document.getElementById('sched-date').value;
  const timeStart = document.getElementById('sched-time-start').value;
  const timeEnd = document.getElementById('sched-time-end').value;
  const recurrence = document.getElementById('sched-recurrence').value;
  
  let selectedDays = [];
  let monthlyWeek = '';
  let monthlyDay = '';

  if (type !== 'Event') {
    if (recurrence === 'Custom Days') {
      document.querySelectorAll('.day-selector input:checked').forEach(cb => selectedDays.push(cb.value));
    } else if (recurrence === 'Monthly') {
      monthlyWeek = document.getElementById('sched-monthly-week').value;
      monthlyDay = document.getElementById('sched-monthly-day').value;
    } else {
      selectedDays = [recurrence];
    }
  }

  const role = document.getElementById('sched-role').value.trim();
  if (!name) return;

  data.schedules.push({
    type,
    name,
    date: type === 'Event' ? date : '',
    timeStart,
    timeEnd,
    recurrence: type === 'Event' ? 'One-Time' : recurrence,
    days: selectedDays,
    monthlyWeek,
    monthlyDay,
    role
  });
  
  data.schedules.sort((a, b) => {
    if (a.date && b.date) return new Date(a.date) - new Date(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });

  document.getElementById('sched-name').value = '';
  document.getElementById('sched-date').value = '';
  document.getElementById('sched-time-start').value = '';
  document.getElementById('sched-time-end').value = '';
  document.getElementById('sched-role').value = '';
  document.querySelectorAll('.day-selector input').forEach(cb => cb.checked = false);
  
  toggleSchedFields();
  saveData();
}

// Books (Add & Edit)
function addBook() {
  const isEntire = document.getElementById('book-entire-series').checked;
  const status = document.getElementById('book-status').value;
  const summary = (status === 'Finished') ? document.getElementById('book-summary').value.trim() : '';

  let newEntry = null;

  if (isEntire && editingBookIndex === null) {
    const series = document.getElementById('book-series-bulk').value.trim();
    if (!series) return;
    newEntry = { title: `${series} (Complete Series)`, series, status, progress: 'Complete', summary, isBulk: true };
    document.getElementById('book-series-bulk').value = '';
  } else {
    const title = document.getElementById('book-title').value.trim();
    const isSeries = document.getElementById('book-is-series').checked;
    let series = '';
    if (isSeries) {
      const sel = document.getElementById('book-series-select').value;
      series = (sel === '__new__') ? document.getElementById('book-series-new').value.trim() : sel;
    }
    const progress = document.getElementById('book-progress').value.trim();
    if (!title) return;

    newEntry = {
      title,
      series,
      status,
      progress,
      summary,
      isBulk: editingBookIndex !== null ? data.books[editingBookIndex].isBulk : false
    };
  }

  if (editingBookIndex !== null) {
    data.books[editingBookIndex] = newEntry;
    editingBookIndex = null;
  } else {
    data.books.push(newEntry);
  }

  cancelEdit('book');
  saveData();
}

function editBook(index) {
  const b = data.books[index];
  editingBookIndex = index;

  document.getElementById('book-form-title').textContent = 'Edit Book';
  document.getElementById('book-submit-btn').textContent = 'Update Book';
  document.getElementById('book-cancel-edit').style.display = 'inline-block';
  document.getElementById('book-entire-wrap').style.display = 'none';
  document.getElementById('book-entire-series').checked = false;
  toggleEntireSeries('book');

  document.getElementById('book-title').value = b.title;
  document.getElementById('book-progress').value = b.progress || '';
  document.getElementById('book-status').value = b.status;
  toggleSummaryField('book');
  document.getElementById('book-summary').value = b.summary || '';

  if (b.series) {
    document.getElementById('book-is-series').checked = true;
    toggleMediaSeriesFields('book');
    document.getElementById('book-series-select').value = b.series;
    toggleNewSeriesInput('book');
  } else {
    document.getElementById('book-is-series').checked = false;
    toggleMediaSeriesFields('book');
  }

  document.getElementById('book-form-card').scrollIntoView({ behavior: 'smooth' });
}

function cycleBookStatus(index) {
  const order = ['To Be Read', 'In Progress', 'Finished'];
  const current = order.indexOf(data.books[index].status);
  data.books[index].status = order[(current + 1) % order.length];
  saveData();
}

// Shows & Movies (Add & Edit)
function addShow() {
  const isEntire = document.getElementById('show-entire-series').checked;
  const status = document.getElementById('show-status').value;
  const summary = (status === 'Finished') ? document.getElementById('show-summary').value.trim() : '';
  const type = document.getElementById('show-type').value;

  let newEntry = null;

  if (isEntire && editingShowIndex === null) {
    const series = document.getElementById('show-series-bulk').value.trim();
    if (!series) return;
    newEntry = { title: `${series} (Complete ${type})`, series, type, status, note: 'Complete', summary, isBulk: true };
    document.getElementById('show-series-bulk').value = '';
  } else {
    const title = document.getElementById('show-title').value.trim();
    const isSeries = document.getElementById('show-is-series').checked;
    let series = '';
    if (isSeries) {
      const sel = document.getElementById('show-series-select').value;
      series = (sel === '__new__') ? document.getElementById('show-series-new').value.trim() : sel;
    }
    const note = document.getElementById('show-note').value.trim();
    if (!title) return;

    newEntry = {
      title,
      series,
      type,
      status,
      note,
      summary,
      isBulk: editingShowIndex !== null ? data.shows[editingShowIndex].isBulk : false
    };
  }

  if (editingShowIndex !== null) {
    data.shows[editingShowIndex] = newEntry;
    editingShowIndex = null;
  } else {
    data.shows.push(newEntry);
  }

  cancelEdit('show');
  saveData();
}

function editShow(index) {
  const s = data.shows[index];
  editingShowIndex = index;

  document.getElementById('show-form-title').textContent = 'Edit Show / Movie';
  document.getElementById('show-submit-btn').textContent = 'Update Show / Movie';
  document.getElementById('show-cancel-edit').style.display = 'inline-block';
  document.getElementById('show-entire-wrap').style.display = 'none';
  document.getElementById('show-entire-series').checked = false;
  toggleEntireSeries('show');

  document.getElementById('show-title').value = s.title;
  document.getElementById('show-type').value = s.type || 'Show';
  document.getElementById('show-note').value = s.note || '';
  document.getElementById('show-status').value = s.status;
  toggleSummaryField('show');
  document.getElementById('show-summary').value = s.summary || '';

  if (s.series) {
    document.getElementById('show-is-series').checked = true;
    toggleMediaSeriesFields('show');
    document.getElementById('show-series-select').value = s.series;
    toggleNewSeriesInput('show');
  } else {
    document.getElementById('show-is-series').checked = false;
    toggleMediaSeriesFields('show');
  }

  document.getElementById('show-form-card').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit(prefix) {
  if (prefix === 'book') {
    editingBookIndex = null;
    document.getElementById('book-form-title').textContent = 'Add a Book';
    document.getElementById('book-submit-btn').textContent = 'Save Book';
    document.getElementById('book-cancel-edit').style.display = 'none';
    document.getElementById('book-entire-wrap').style.display = 'flex';
    document.getElementById('book-title').value = '';
    document.getElementById('book-series-new').value = '';
    document.getElementById('book-progress').value = '';
    document.getElementById('book-summary').value = '';
    document.getElementById('book-entire-series').checked = false;
    document.getElementById('book-is-series').checked = false;
    toggleEntireSeries('book');
    toggleMediaSeriesFields('book');
    toggleSummaryField('book');
  } else {
    editingShowIndex = null;
    document.getElementById('show-form-title').textContent = 'Add Show or Movie';
    document.getElementById('show-submit-btn').textContent = 'Save Show / Movie';
    document.getElementById('show-cancel-edit').style.display = 'none';
    document.getElementById('show-entire-wrap').style.display = 'flex';
    document.getElementById('show-title').value = '';
    document.getElementById('show-series-new').value = '';
    document.getElementById('show-note').value = '';
    document.getElementById('show-summary').value = '';
    document.getElementById('show-entire-series').checked = false;
    document.getElementById('show-is-series').checked = false;
    toggleEntireSeries('show');
    toggleMediaSeriesFields('show');
    toggleSummaryField('show');
  }
}

function cycleShowStatus(index) {
  const order = ['Watchlist', 'Watching', 'Finished'];
  const current = order.indexOf(data.shows[index].status);
  data.shows[index].status = order[(current + 1) % order.length];
  saveData();
}

// Summary Toggle & Folder Toggles
function toggleSummary(id) {
  openSummaries[id] = !openSummaries[id];
  renderAll();
}

function toggleFolder(folderKey) {
  openFolders[folderKey] = !openFolders[folderKey];
  renderAll();
}

// Live Stock Price Fetcher
async function fetchLiveStockPrice(symbol) {
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`;
  
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error('Network error');
  const json = await response.json();
  const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof price !== 'number') throw new Error('Ticker not found');
  return price;
}

async function addStock() {
  const symbol = document.getElementById('stock-symbol').value.trim().toUpperCase();
  const shares = parseFloat(document.getElementById('stock-shares').value) || 1;
  const buy = parseFloat(document.getElementById('stock-buy').value);
  const statusMsg = document.getElementById('stock-status-msg');
  const btn = document.getElementById('add-stock-btn');
  
  if (!symbol || isNaN(buy)) return;

  btn.disabled = true;
  btn.textContent = 'Fetching Price...';
  statusMsg.textContent = `Looking up ${symbol}...`;

  let currPrice = null;
  try {
    currPrice = await fetchLiveStockPrice(symbol);
    statusMsg.textContent = `Found ${symbol} at $${currPrice.toFixed(2)}`;
  } catch (err) {
    const manual = prompt(`Could not auto-fetch price for ${symbol}. Enter current price manually ($):`);
    if (manual !== null && !isNaN(parseFloat(manual))) {
      currPrice = parseFloat(manual);
      statusMsg.textContent = '';
    } else {
      statusMsg.textContent = `Cancelled adding ${symbol}.`;
      btn.disabled = false;
      btn.textContent = 'Fetch Live Price & Add';
      return;
    }
  }

  data.stocks.push({ symbol, shares, buy, curr: currPrice });
  
  document.getElementById('stock-symbol').value = '';
  document.getElementById('stock-shares').value = '';
  document.getElementById('stock-buy').value = '';
  btn.disabled = false;
  btn.textContent = 'Fetch Live Price & Add';
  saveData();
}

async function refreshAllStocks() {
  if (data.stocks.length === 0) return;
  const btn = document.getElementById('refresh-stocks-btn');
  const statusMsg = document.getElementById('stock-status-msg');
  btn.disabled = true;
  btn.textContent = 'Updating...';
  statusMsg.textContent = 'Fetching latest market prices...';

  let updatedCount = 0;
  for (let i = 0; i < data.stocks.length; i++) {
    try {
      const livePrice = await fetchLiveStockPrice(data.stocks[i].symbol);
      data.stocks[i].curr = livePrice;
      updatedCount++;
    } catch (e) {}
  }

  btn.disabled = false;
  btn.textContent = 'Refresh Prices';
  statusMsg.textContent = `Updated ${updatedCount} of ${data.stocks.length} stocks.`;
  saveData();
}

function updateStockPrice(index) {
  const newPrice = prompt(`Enter manual price for ${data.stocks[index].symbol}:`, data.stocks[index].curr);
  if (newPrice !== null && !isNaN(parseFloat(newPrice))) {
    data.stocks[index].curr = parseFloat(newPrice);
    saveData();
  }
}

// Projects, Awards, Goals, Wish List
function addProject() {
  const category = document.getElementById('proj-category').value;
  const status = document.getElementById('proj-status').value;
  const name = document.getElementById('proj-name').value.trim();
  const notes = document.getElementById('proj-notes').value.trim();
  if (!name) return;
  data.projects.push({ category, status, name, notes });
  document.getElementById('proj-name').value = '';
  document.getElementById('proj-notes').value = '';
  saveData();
}

function toggleProjectStatus(index) {
  data.projects[index].status = data.projects[index].status === 'In Progress' ? 'Completed' : 'In Progress';
  saveData();
}

function addAward() {
  const name = document.getElementById('award-name').value.trim();
  const org = document.getElementById('award-org').value.trim();
  const date = document.getElementById('award-date').value.trim();
  if (!name) return;
  data.awards.push({ name, org, date });
  document.getElementById('award-name').value = '';
  document.getElementById('award-org').value = '';
  document.getElementById('award-date').value = '';
  saveData();
}

function addGoal() {
  const input = document.getElementById('goal-input');
  if (!input.value.trim()) return;
  data.goals.push({ text: input.value.trim(), done: false });
  input.value = '';
  saveData();
}

function addWish() {
  const name = document.getElementById('wish-name').value.trim();
  const link = document.getElementById('wish-link').value.trim();
  const price = parseFloat(document.getElementById('wish-price').value) || 0;
  if (!name) return;
  data.wishes.push({ name, link, price });
  document.getElementById('wish-name').value = '';
  document.getElementById('wish-link').value = '';
  document.getElementById('wish-price').value = '';
  saveData();
}

function deleteItem(key, index) {
  data[key].splice(index, 1);
  saveData();
}

// Backup & Restore
function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-life-os-backup.json';
  a.click();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    data = JSON.parse(e.target.result);
    saveData();
    alert('Backup restored!');
  };
  reader.readAsText(file);
}

// Helper to render grouped media items with auto-series folding (>2 items)
function renderMediaGrouped(items, statusName, typeKey, cycleFunc, editFunc) {
  const filtered = items.map((item, i) => ({ ...item, i })).filter(item => item.status === statusName);
  
  let seriesMap = {};
  let standalone = [];

  filtered.forEach(item => {
    if (item.series && item.series.trim() !== '') {
      if (!seriesMap[item.series]) seriesMap[item.series] = [];
      seriesMap[item.series].push(item);
    } else {
      standalone.push(item);
    }
  });

  let html = '';

  standalone.forEach(item => {
    html += renderSingleMediaItem(item, typeKey, cycleFunc, editFunc);
  });

  Object.keys(seriesMap).forEach(seriesName => {
    const group = seriesMap[seriesName];
    const folderKey = `${typeKey}-${statusName}-${seriesName}`;
    const isOpen = openFolders[folderKey];

    if (group.length > 2) {
      html += `
        <div class="series-folder">
          <div class="series-folder-header" onclick="toggleFolder('${folderKey}')">
            <span>📚 ${seriesName} (${group.length} items)</span>
            <span class="btn-small">${isOpen ? '▲ Collapse' : '▼ Expand'}</span>
          </div>
          <div class="series-children" style="display: ${isOpen ? 'block' : 'none'};">
      `;
      group.forEach(item => {
        html += renderSingleMediaItem(item, typeKey, cycleFunc, editFunc);
      });
      html += `</div></div>`;
    } else {
      group.forEach(item => {
        html += renderSingleMediaItem(item, typeKey, cycleFunc, editFunc);
      });
    }
  });

  return html || '<p class="item-sub">None here yet.</p>';
}

function renderSingleMediaItem(item, typeKey, cycleFunc, editFunc) {
  const uniqueId = `${typeKey}-${item.i}`;
  const hasSummary = item.summary && item.summary.trim() !== '';
  const isSummaryOpen = openSummaries[uniqueId];

  let summaryHTML = '';
  if (hasSummary) {
    summaryHTML = `
      <div class="summary-box" style="display: ${isSummaryOpen ? 'block' : 'none'};">
        <strong>Summary:</strong> ${item.summary}
      </div>
    `;
  }

  const titleClickAction = hasSummary ? `onclick="toggleSummary('${uniqueId}')"` : '';
  const titleStyle = hasSummary ? 'cursor: pointer; color: var(--primary);' : '';

  return `
    <div class="media-item-wrap">
      <div class="media-header">
        <div class="item-info">
          <div class="item-title" ${titleClickAction} style="${titleStyle}">
            ${item.title} ${item.series ? '<span class="badge">' + item.series + '</span>' : ''} ${item.type ? '<span class="badge" style="background:#e0f2fe; color:#0369a1;">' + item.type + '</span>' : ''}
          </div>
          <div class="item-sub">${item.progress || item.note || (hasSummary ? 'Tap title for summary' : '')}</div>
        </div>
        <button class="btn-small" onclick="${editFunc}(${item.i})">Edit</button>
        <button class="btn-small" onclick="${cycleFunc}(${item.i})">Move</button>
        <button class="del-btn" onclick="deleteItem('${typeKey}', ${item.i})">X</button>
      </div>
      ${summaryHTML}
    </div>
  `;
}

// Helper to format schedule description
function formatScheduleDetail(s) {
  if (s.date) return `📅 ${s.date}`;
  if (s.recurrence === 'Monthly') {
    const ordinalMap = { '1': '1st', '2': '2nd', '3': '3rd', '4': '4th', 'last': 'Last' };
    return `Monthly (${ordinalMap[s.monthlyWeek] || s.monthlyWeek} ${s.monthlyDay})`;
  }
  if (s.recurrence === 'Custom Days' && Array.isArray(s.days)) {
    return s.days.join(', ');
  }
  return s.recurrence || '';
}

// Render Everything
function renderAll() {
  const today = new Date();
  document.getElementById('today-date').textContent = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  document.getElementById('water-count').textContent = data.water;
  document.getElementById('scratchpad').value = data.scratchpad || '';

  // Period Visibility & Predictor
  const periodContent = document.getElementById('period-tracker-content');
  const toggleBtn = document.getElementById('toggle-period-btn');
  if (data.periodHidden) {
    periodContent.style.display = 'none';
    toggleBtn.textContent = 'Show';
  } else {
    periodContent.style.display = 'block';
    toggleBtn.textContent = 'Hide';
  }

  const nextPeriod = getPredictedPeriodDate();
  const predOption = document.getElementById('predicted-phase-option');
  const predText = document.getElementById('period-prediction-text');
  if (nextPeriod) {
    const formattedPred = nextPeriod.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    predOption.textContent = `Predicted Next Period: ${formattedPred}`;
    predText.textContent = `Estimated Next Period: ${formattedPred} (28-day cycle)`;
  } else {
    predOption.textContent = `Predicted Next: Log dates below`;
    predText.textContent = `Tap dates on the calendar to predict your next cycle.`;
  }

  if (data.cycleStatus) {
    document.getElementById('cycle-status-select').value = data.cycleStatus;
  }

  renderCalendar();
  populateSeriesDropdowns();

  // Todos
  document.getElementById('todo-list').innerHTML = data.todos.map((t, i) => `
    <li>
      <span onclick="toggleTodo(${i})" class="item-info ${t.done ? 'done-text' : ''}">${t.done ? '☑' : '☐'} ${t.text}</span>
      <button class="del-btn" onclick="deleteItem('todos', ${i})">X</button>
    </li>
  `).join('');

  // Full Schedules & Events Sorted
  const renderSchedRow = (s, i, showDelete) => {
    let timeStr = (s.timeStart || s.timeEnd) ? `${s.timeStart || ''} - ${s.timeEnd || ''}` : '';
    let scheduleDetail = formatScheduleDetail(s);
    return `
      <li>
        <div class="item-info">
          <div class="item-title">[${s.type}] ${s.name}</div>
          <div class="item-sub">${scheduleDetail} ${timeStr ? '• ' + timeStr : ''} ${s.role ? '• ' + s.role : ''}</div>
        </div>
        ${showDelete ? `<button class="del-btn" onclick="deleteItem('schedules', ${i})">X</button>` : ''}
      </li>
    `;
  };

  document.getElementById('full-schedule-list').innerHTML = data.schedules.map((s, i) => renderSchedRow(s, i, true)).join('');

  // Today's Filtered Schedule (Only items matching today's day/date!)
  const todayItems = data.schedules
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => isScheduledForDate(s, today));

  document.getElementById('today-schedule-list').innerHTML = todayItems.length > 0
    ? todayItems.map(({ s, i }) => renderSchedRow(s, i, false)).join('')
    : '<li class="item-sub">Nothing scheduled for today!</li>';

  // Resume Sections
  document.getElementById('resume-classes').innerHTML = data.schedules
    .filter(s => s.type === 'Class')
    .map(s => `<li><strong>${s.name}</strong>${s.role ? ' — ' + s.role : ''}</li>`).join('') || '<li>Add classes in Schedule tab</li>';

  document.getElementById('resume-clubs').innerHTML = data.schedules
    .filter(s => s.type === 'Club')
    .map(s => `<li><strong>${s.name}</strong>${s.role ? ' — ' + s.role : ''}</li>`).join('') || '<li>Add clubs in Schedule tab</li>';

  document.getElementById('resume-projects').innerHTML = data.projects
    .map(p => `<li><strong>${p.name} (${p.category})</strong> — ${p.status}${p.notes ? ': ' + p.notes : ''}</li>`).join('') || '<li>Add projects in Projects tab</li>';

  document.getElementById('resume-awards').innerHTML = data.awards
    .map(a => `<li><strong>${a.name}</strong>${a.org ? ' — ' + a.org : ''}${a.date ? ' (' + a.date + ')' : ''}</li>`).join('') || '<li>Add awards in Projects & Goals tab</li>';

  // Books
  document.getElementById('books-in-progress').innerHTML = renderMediaGrouped(data.books, 'In Progress', 'books', 'cycleBookStatus', 'editBook');
  document.getElementById('books-tbr').innerHTML = renderMediaGrouped(data.books, 'To Be Read', 'books', 'cycleBookStatus', 'editBook');
  document.getElementById('books-finished').innerHTML = renderMediaGrouped(data.books, 'Finished', 'books', 'cycleBookStatus', 'editBook');

  // Shows & Movies
  document.getElementById('shows-watching').innerHTML = renderMediaGrouped(data.shows, 'Watching', 'shows', 'cycleShowStatus', 'editShow');
  document.getElementById('shows-watchlist').innerHTML = renderMediaGrouped(data.shows, 'Watchlist', 'shows', 'cycleShowStatus', 'editShow');
  document.getElementById('shows-finished').innerHTML = renderMediaGrouped(data.shows, 'Finished', 'shows', 'cycleShowStatus', 'editShow');

  // Stocks
  let totalStockProfit = 0;
  document.getElementById('stock-list').innerHTML = data.stocks.map((st, i) => {
    const profit = (st.curr - st.buy) * st.shares;
    const pct = st.buy > 0 ? (((st.curr - st.buy) / st.buy) * 100).toFixed(1) : '0.0';
    totalStockProfit += profit;
    const isGain = profit >= 0;
    const colorStyle = isGain ? 'color:#16a34a; font-weight:700;' : 'color:#dc2626; font-weight:700;';
    const sign = isGain ? '+' : '';
    return `
      <li>
        <div class="item-info">
          <div class="item-title">${st.symbol} <span class="item-sub">(${st.shares} sh @ $${st.buy.toFixed(2)})</span></div>
          <div class="item-sub">Curr: $${st.curr.toFixed(2)} • <span style="${colorStyle}">${sign}$${profit.toFixed(2)} (${sign}${pct}%)</span></div>
        </div>
        <button class="btn-small" onclick="updateStockPrice(${i})">Edit $</button>
        <button class="del-btn" onclick="deleteItem('stocks', ${i})">X</button>
      </li>
    `;
  }).join('');

  const totalProfitEl = document.getElementById('stock-total-profit');
  const totalSign = totalStockProfit >= 0 ? '+' : '';
  totalProfitEl.textContent = `Profit: ${totalSign}$${totalStockProfit.toFixed(2)}`;
  totalProfitEl.style.background = totalStockProfit >= 0 ? '#dcfce7' : '#fee2e2';
  totalProfitEl.style.color = totalStockProfit >= 0 ? '#166534' : '#991b1b';

  // Projects
  document.getElementById('project-list').innerHTML = data.projects.map((p, i) => `
    <li>
      <div class="item-info">
        <div class="item-title">[${p.category}] ${p.name}</div>
        <div class="item-sub">${p.status} ${p.notes ? '• ' + p.notes : ''}</div>
      </div>
      <button class="btn-small" onclick="toggleProjectStatus(${i})">Toggle Done</button>
      <button class="del-btn" onclick="deleteItem('projects', ${i})">X</button>
    </li>
  `).join('');

  // Awards
  document.getElementById('award-list').innerHTML = data.awards.map((a, i) => `
    <li>
      <div class="item-info">
        <div class="item-title">🏆 ${a.name}</div>
        <div class="item-sub">${a.org || ''}${a.org && a.date ? ' • ' : ''}${a.date || ''}</div>
      </div>
      <button class="del-btn" onclick="deleteItem('awards', ${i})">X</button>
    </li>
  `).join('');

  // Goals
  document.getElementById('goal-list').innerHTML = data.goals.map((g, i) => `
    <li>
      <span onclick="data.goals[${i}].done = !data.goals[${i}].done; saveData();" class="item-info ${g.done ? 'done-text' : ''}">
        ${g.done ? '★' : '☆'} ${g.text}
      </span>
      <button class="del-btn" onclick="deleteItem('goals', ${i})">X</button>
    </li>
  `).join('');

  // Wish List
  let total = 0;
  document.getElementById('wish-list').innerHTML = data.wishes.map((w, i) => {
    total += w.price;
    let linkHTML = w.link ? `<a href="${w.link}" target="_blank" class="btn-small" style="text-decoration:none; margin-right:4px;">Link</a>` : '';
    return `
      <li>
        <div class="item-info">
          <div class="item-title">${w.name}</div>
          <div class="item-sub">$${w.price.toFixed(2)}</div>
        </div>
        ${linkHTML}
        <button class="del-btn" onclick="deleteItem('wishes', ${i})">X</button>
      </li>
    `;
  }).join('');
  document.getElementById('wish-total').textContent = total.toFixed(2);
}

renderAll();
toggleSchedFields();
toggleMediaSeriesFields('book');
toggleMediaSeriesFields('show');
toggleEntireSeries('book');
toggleEntireSeries('show');
toggleSummaryField('book');
toggleSummaryField('show');