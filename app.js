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
  wishes: [],
  parentDebts: [],
  expenses: [],
  dreamSchoolPlan: '',
  colleges: [],
  coursePlan: [],
  scholarships: []
};

if (!data.stocks) data.stocks = [];
if (!data.awards) data.awards = [];
if (!data.parentDebts) data.parentDebts = [];
if (!data.expenses) data.expenses = [];
if (!data.colleges) data.colleges = [];
if (!data.coursePlan) data.coursePlan = [];
if (!data.scholarships) data.scholarships = [];
if (typeof data.dreamSchoolPlan === 'undefined') data.dreamSchoolPlan = '';
if (typeof data.periodHidden === 'undefined') data.periodHidden = false;

let currentCalDate = new Date();
let openSummaries = {};
let openFolders = {};
let editingBookIndex = null;
let editingShowIndex = null;
let editingProjectIndex = null;
let editingAwardIndex = null;
let editingGoalIndex = null;
let editingWishIndex = null;
let editingCollegeIndex = null;
let editingScholarshipIndex = null;

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
  bookSelect.innerHTML = bookSeriesList.map(s => `<option value="${s.replace(/"/g, '&quot;')}">${s}</option>`).join('') +
    `<option value="__new__">+ Add New Series</option>`;
  if (bookSeriesList.includes(prevBookVal)) bookSelect.value = prevBookVal;
  else if (bookSeriesList.length > 0 && prevBookVal !== '__new__') bookSelect.value = bookSeriesList[0];
  else bookSelect.value = '__new__';
  toggleNewSeriesInput('book');

  const showSeriesList = [...new Set(data.shows.map(s => s.series).filter(Boolean))];
  const showSelect = document.getElementById('show-series-select');
  const prevShowVal = showSelect.value;
  showSelect.innerHTML = showSeriesList.map(s => `<option value="${s.replace(/"/g, '&quot;')}">${s}</option>`).join('') +
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

// Helper for schedule filtering
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
  if (item.recurrence === 'Everyday') return true;
  if (item.recurrence === 'Weekdays (Mon-Fri)') return targetDate.getDay() >= 1 && targetDate.getDay() <= 5;
  if (item.recurrence === 'Custom Days') return Array.isArray(item.days) && item.days.includes(dayShort);
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
  } else if (prefix === 'show') {
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
  } else if (prefix === 'project') {
    editingProjectIndex = null;
    document.getElementById('project-form-title').textContent = 'Projects (Art, Robotics, etc.)';
    document.getElementById('project-submit-btn').textContent = 'Add Project';
    document.getElementById('project-cancel-edit').style.display = 'none';
    document.getElementById('proj-name').value = '';
    document.getElementById('proj-notes').value = '';
  } else if (prefix === 'award') {
    editingAwardIndex = null;
    document.getElementById('award-form-title').textContent = 'Awards & Honors';
    document.getElementById('award-submit-btn').textContent = 'Add Award';
    document.getElementById('award-cancel-edit').style.display = 'none';
    document.getElementById('award-name').value = '';
    document.getElementById('award-org').value = '';
    document.getElementById('award-date').value = '';
  } else if (prefix === 'goal') {
    editingGoalIndex = null;
    document.getElementById('goal-form-title').textContent = 'Life Goals';
    document.getElementById('goal-submit-btn').textContent = 'Add';
    document.getElementById('goal-cancel-edit').style.display = 'none';
    document.getElementById('goal-input').value = '';
  } else if (prefix === 'wish') {
    editingWishIndex = null;
    document.getElementById('wish-form-title').textContent = 'Shopping Wish List';
    document.getElementById('wish-submit-btn').textContent = 'Add to Wish List';
    document.getElementById('wish-cancel-edit').style.display = 'none';
    document.getElementById('wish-name').value = '';
    document.getElementById('wish-link').value = '';
    document.getElementById('wish-price').value = '';
  } else if (prefix === 'college') {
    editingCollegeIndex = null;
    document.getElementById('college-form-title').textContent = 'Prospective Colleges';
    document.getElementById('college-submit-btn').textContent = 'Add College';
    document.getElementById('college-cancel-edit').style.display = 'none';
    document.getElementById('col-name').value = '';
    document.getElementById('col-notes').value = '';
  } else if (prefix === 'scholarship') {
    editingScholarshipIndex = null;
    document.getElementById('scholarship-form-title').textContent = 'Scholarships Tracker';
    document.getElementById('scholarship-submit-btn').textContent = 'Save Scholarship';
    document.getElementById('scholarship-cancel-edit').style.display = 'none';
    document.getElementById('schol-name').value = '';
    document.getElementById('schol-amount').value = '';
    document.getElementById('schol-deadline').value = '';
    document.getElementById('schol-materials').value = '';
    document.getElementById('schol-info').value = '';
  }
}

function cycleShowStatus(index) {
  const order = ['Watchlist', 'Watching', 'Finished'];
  const current = order.indexOf(data.shows[index].status);
  data.shows[index].status = order[(current + 1) % order.length];
  saveData();
}

// Project, Award, Goal, Wish Edit Handlers
function editProject(index) {
  const p = data.projects[index];
  editingProjectIndex = index;
  document.getElementById('project-form-title').textContent = 'Edit Project';
  document.getElementById('project-submit-btn').textContent = 'Update Project';
  document.getElementById('project-cancel-edit').style.display = 'inline-block';
  document.getElementById('proj-category').value = p.category;
  document.getElementById('proj-status').value = p.status;
  document.getElementById('proj-name').value = p.name;
  document.getElementById('proj-notes').value = p.notes || '';
  document.getElementById('project-form-card').scrollIntoView({ behavior: 'smooth' });
}

function editAward(index) {
  const a = data.awards[index];
  editingAwardIndex = index;
  document.getElementById('award-form-title').textContent = 'Edit Award';
  document.getElementById('award-submit-btn').textContent = 'Update Award';
  document.getElementById('award-cancel-edit').style.display = 'inline-block';
  document.getElementById('award-name').value = a.name;
  document.getElementById('award-org').value = a.org || '';
  document.getElementById('award-date').value = a.date || '';
  document.getElementById('award-form-card').scrollIntoView({ behavior: 'smooth' });
}

function editGoal(index) {
  const g = data.goals[index];
  editingGoalIndex = index;
  document.getElementById('goal-form-title').textContent = 'Edit Goal';
  document.getElementById('goal-submit-btn').textContent = 'Update';
  document.getElementById('goal-cancel-edit').style.display = 'inline-block';
  document.getElementById('goal-input').value = g.text;
  document.getElementById('goal-form-card').scrollIntoView({ behavior: 'smooth' });
}

function editWish(index) {
  const w = data.wishes[index];
  editingWishIndex = index;
  document.getElementById('wish-form-title').textContent = 'Edit Wish Item';
  document.getElementById('wish-submit-btn').textContent = 'Update Wish Item';
  document.getElementById('wish-cancel-edit').style.display = 'inline-block';
  document.getElementById('wish-name').value = w.name;
  document.getElementById('wish-link').value = w.link || '';
  document.getElementById('wish-price').value = w.price;
  document.getElementById('wish-form-card').scrollIntoView({ behavior: 'smooth' });
}

// ==========================================
// MONEY & PARENT DEBT TRACKER
// ==========================================
function addParentDebt() {
  const type = document.getElementById('debt-type').value;
  const amount = parseFloat(document.getElementById('debt-amount').value);
  const desc = document.getElementById('debt-desc').value.trim();
  if (isNaN(amount) || amount <= 0 || !desc) return;

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  data.parentDebts.unshift({ type, amount, desc, date: dateStr });

  document.getElementById('debt-amount').value = '';
  document.getElementById('debt-desc').value = '';
  saveData();
}

function addExpense() {
  const type = document.getElementById('exp-type').value;
  const category = document.getElementById('exp-category').value;
  const desc = document.getElementById('exp-desc').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  if (isNaN(amount) || amount <= 0 || !desc) return;

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  data.expenses.unshift({ type, category, desc, amount, date: dateStr });

  document.getElementById('exp-desc').value = '';
  document.getElementById('exp-amount').value = '';
  saveData();
}

// ==========================================
// COLLEGE PREP, COURSE PLAN & SCHOLARSHIPS
// ==========================================
function saveDreamPlan() {
  data.dreamSchoolPlan = document.getElementById('dream-school-plan').value;
  localStorage.setItem('lifeOSData', JSON.stringify(data));
}

function addCollege() {
  const name = document.getElementById('col-name').value.trim();
  const tier = document.getElementById('col-tier').value;
  const notes = document.getElementById('col-notes').value.trim();
  if (!name) return;

  const colObj = { name, tier, notes };
  if (editingCollegeIndex !== null) {
    data.colleges[editingCollegeIndex] = colObj;
  } else {
    data.colleges.push(colObj);
  }
  cancelEdit('college');
  saveData();
}

function editCollege(index) {
  const c = data.colleges[index];
  editingCollegeIndex = index;
  document.getElementById('college-form-title').textContent = 'Edit College';
  document.getElementById('college-submit-btn').textContent = 'Update College';
  document.getElementById('college-cancel-edit').style.display = 'inline-block';
  document.getElementById('col-name').value = c.name;
  document.getElementById('col-tier').value = c.tier;
  document.getElementById('col-notes').value = c.notes || '';
  document.getElementById('college-form-card').scrollIntoView({ behavior: 'smooth' });
}

function addCoursePlan() {
  const grade = document.getElementById('course-grade').value;
  const status = document.getElementById('course-status').value;
  const name = document.getElementById('course-name').value.trim();
  if (!name) return;

  data.coursePlan.push({ grade, status, name });
  document.getElementById('course-name').value = '';
  saveData();
}

function cycleCourseStatus(index) {
  const order = ['Planned', 'Taking', 'Completed'];
  const current = order.indexOf(data.coursePlan[index].status);
  data.coursePlan[index].status = order[(current + 1) % order.length];
  saveData();
}

function toggleBulkScholarship() {
  const box = document.getElementById('bulk-scholarship-box');
  box.style.display = (box.style.display === 'none') ? 'block' : 'none';
}

function importBulkScholarships() {
  const rawText = document.getElementById('bulk-scholarship-text').value.trim();
  if (!rawText) return;

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  lines.forEach(line => {
    const parts = line.split('|').map(p => p.trim());
    const name = parts[0] || line;
    const amount = parts[1] || '';
    const deadline = parts[2] || '';
    const materials = parts[3] || '';
    const info = parts[4] || '';
    data.scholarships.push({
      name,
      amount,
      deadline,
      materials,
      info,
      status: 'To Apply'
    });
  });

  document.getElementById('bulk-scholarship-text').value = '';
  document.getElementById('bulk-scholarship-box').style.display = 'none';
  saveData();
}

function addScholarship() {
  const name = document.getElementById('schol-name').value.trim();
  const amount = document.getElementById('schol-amount').value.trim();
  const deadline = document.getElementById('schol-deadline').value.trim();
  const status = document.getElementById('schol-status').value;
  const materials = document.getElementById('schol-materials').value.trim();
  const info = document.getElementById('schol-info').value.trim();
  if (!name) return;

  const scholObj = { name, amount, deadline, status, materials, info };
  if (editingScholarshipIndex !== null) {
    data.scholarships[editingScholarshipIndex] = scholObj;
  } else {
    data.scholarships.push(scholObj);
  }
  cancelEdit('scholarship');
  saveData();
}

function editScholarship(index) {
  const s = data.scholarships[index];
  editingScholarshipIndex = index;
  document.getElementById('scholarship-form-title').textContent = 'Edit Scholarship';
  document.getElementById('scholarship-submit-btn').textContent = 'Update Scholarship';
  document.getElementById('scholarship-cancel-edit').style.display = 'inline-block';
  document.getElementById('schol-name').value = s.name;
  document.getElementById('schol-amount').value = s.amount || '';
  document.getElementById('schol-deadline').value = s.deadline || '';
  document.getElementById('schol-status').value = s.status || 'To Apply';
  document.getElementById('schol-materials').value = s.materials || '';
  document.getElementById('schol-info').value = s.info || '';
  document.getElementById('scholarship-form-card').scrollIntoView({ behavior: 'smooth' });
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

  const projObj = { category, status, name, notes };
  if (editingProjectIndex !== null) {
    data.projects[editingProjectIndex] = projObj;
  } else {
    data.projects.push(projObj);
  }
  cancelEdit('project');
  saveData();
}

function addAward() {
  const name = document.getElementById('award-name').value.trim();
  const org = document.getElementById('award-org').value.trim();
  const date = document.getElementById('award-date').value.trim();
  if (!name) return;

  const awardObj = { name, org, date };
  if (editingAwardIndex !== null) {
    data.awards[editingAwardIndex] = awardObj;
  } else {
    data.awards.push(awardObj);
  }
  cancelEdit('award');
  saveData();
}

function addGoal() {
  const input = document.getElementById('goal-input');
  const text = input.value.trim();
  if (!text) return;

  if (editingGoalIndex !== null) {
    data.goals[editingGoalIndex].text = text;
  } else {
    data.goals.push({ text, done: false });
  }
  cancelEdit('goal');
  saveData();
}

function addWish() {
  const name = document.getElementById('wish-name').value.trim();
  const link = document.getElementById('wish-link').value.trim();
  const price = parseFloat(document.getElementById('wish-price').value) || 0;
  if (!name) return;

  const wishObj = { name, link, price };
  if (editingWishIndex !== null) {
    data.wishes[editingWishIndex] = wishObj;
  } else {
    data.wishes.push(wishObj);
  }
  cancelEdit('wish');
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

// Helper to render grouped media items
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
  document.getElementById('dream-school-plan').value = data.dreamSchoolPlan || '';

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

  // Money & Parent Debt
  let totalOwed = 0;
  document.getElementById('parent-debt-list').innerHTML = data.parentDebts.map((d, i) => {
    if (d.type === 'owe') totalOwed += d.amount;
    else totalOwed -= d.amount;
    const isOwe = d.type === 'owe';
    return `
      <li>
        <div class="item-info">
          <div class="item-title">${d.desc}</div>
          <div class="item-sub">${d.date} • <span style="color:${isOwe ? '#dc2626' : '#16a34a'}; font-weight:700;">${isOwe ? '+$' + d.amount.toFixed(2) + ' owed' : '-$' + d.amount.toFixed(2) + ' paid back'}</span></div>
        </div>
        <button class="del-btn" onclick="deleteItem('parentDebts', ${i})">X</button>
      </li>
    `;
  }).join('');
  const debtBadge = document.getElementById('parent-debt-total');
  debtBadge.textContent = `Owed: $${Math.max(0, totalOwed).toFixed(2)}`;
  debtBadge.style.background = totalOwed > 0 ? '#fee2e2' : '#dcfce7';
  debtBadge.style.color = totalOwed > 0 ? '#dc2626' : '#166534';

  let netBalance = 0;
  document.getElementById('expense-list').innerHTML = data.expenses.map((e, i) => {
    if (e.type === 'income') netBalance += e.amount;
    else netBalance -= e.amount;
    const isInc = e.type === 'income';
    return `
      <li>
        <div class="item-info">
          <div class="item-title">[${e.category}] ${e.desc}</div>
          <div class="item-sub">${e.date} • <span style="color:${isInc ? '#16a34a' : '#dc2626'}; font-weight:700;">${isInc ? '+$' : '-$'}${e.amount.toFixed(2)}</span></div>
        </div>
        <button class="del-btn" onclick="deleteItem('expenses', ${i})">X</button>
      </li>
    `;
  }).join('');
  const balBadge = document.getElementById('personal-balance-total');
  const balSign = netBalance >= 0 ? '+' : '-';
  balBadge.textContent = `Net: ${balSign}$${Math.abs(netBalance).toFixed(2)}`;
  balBadge.style.background = netBalance >= 0 ? '#dcfce7' : '#fee2e2';
  balBadge.style.color = netBalance >= 0 ? '#166534' : '#dc2626';

  // College Prep: Prospective Colleges
  document.getElementById('college-list').innerHTML = data.colleges.map((c, i) => {
    let tierBg = '#eef2ff'; let tierCol = '#4f46e5';
    if (c.tier === 'Dream') { tierBg = '#fef08a'; tierCol = '#854d0e'; }
    else if (c.tier === 'Safety') { tierBg = '#dcfce7'; tierCol = '#166534'; }
    return `
      <li>
        <div class="item-info">
          <div class="item-title">${c.name} <span class="badge" style="background:${tierBg}; color:${tierCol};">${c.tier}</span></div>
          <div class="item-sub">${c.notes || ''}</div>
        </div>
        <button class="btn-small" onclick="editCollege(${i})">Edit</button>
        <button class="del-btn" onclick="deleteItem('colleges', ${i})">X</button>
      </li>
    `;
  }).join('');

  // College Prep: 4-Year Course Plan
  const grades = ['9th Grade', '10th Grade', '11th Grade', '12th Grade'];
  document.getElementById('course-plan-container').innerHTML = grades.map(g => {
    const items = data.coursePlan.map((c, i) => ({ ...c, i })).filter(c => c.grade === g);
    const listHTML = items.length > 0 ? items.map(c => `
      <div class="row space-between" style="padding:6px 0; border-bottom:1px solid var(--border);">
        <span style="font-size:0.9rem;">${c.name} <span class="badge" style="font-size:0.72rem;">${c.status}</span></span>
        <div class="row" style="gap:4px;">
          <button class="btn-small" onclick="cycleCourseStatus(${c.i})">Status</button>
          <button class="del-btn" onclick="deleteItem('coursePlan', ${c.i})">X</button>
        </div>
      </div>
    `).join('') : '<p class="item-sub">No courses added for this year.</p>';

    return `<div style="margin-bottom:12px;"><h3>${g}</h3>${listHTML}</div>`;
  }).join('');

  // College Prep: Scholarships
  document.getElementById('scholarship-list').innerHTML = data.scholarships.map((s, i) => `
    <div class="media-item-wrap">
      <div class="media-header">
        <div class="item-info">
          <div class="item-title">${s.name} ${s.amount ? '<span class="badge" style="background:#dcfce7; color:#166534;">' + s.amount + '</span>' : ''} <span class="badge">${s.status}</span></div>
          <div class="item-sub">${s.deadline ? '⏰ Due: ' + s.deadline : ''} ${s.materials ? '• 📋 ' + s.materials : ''}</div>
          ${s.info ? `<div class="item-sub" style="margin-top:2px;">ℹ️ ${s.info}</div>` : ''}
        </div>
        <button class="btn-small" onclick="editScholarship(${i})">Edit</button>
        <button class="del-btn" onclick="deleteItem('scholarships', ${i})">X</button>
      </div>
    </div>
  `).join('');

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
      <button class="btn-small" onclick="editProject(${i})">Edit</button>
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
      <button class="btn-small" onclick="editAward(${i})">Edit</button>
      <button class="del-btn" onclick="deleteItem('awards', ${i})">X</button>
    </li>
  `).join('');

  // Goals
  document.getElementById('goal-list').innerHTML = data.goals.map((g, i) => `
    <li>
      <span onclick="data.goals[${i}].done = !data.goals[${i}].done; saveData();" class="item-info ${g.done ? 'done-text' : ''}">
        ${g.done ? '★' : '☆'} ${g.text}
      </span>
      <button class="btn-small" onclick="editGoal(${i})" style="margin-right:4px;">Edit</button>
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
        <button class="btn-small" onclick="editWish(${i})" style="margin-right:4px;">Edit</button>
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