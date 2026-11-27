// Load saved data from phone's localStorage or create blank defaults
let data = JSON.parse(localStorage.getItem('lifeOSData')) || {
  water: 0,
  periodDates: [],
  todos: [],
  scratchpad: '',
  schedules: [],
  books: [],
  shows: [],
  projects: [],
  goals: [],
  wishes: []
};

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
}

function switchMediaSub(subName, btn) {
  document.querySelectorAll('.media-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('media-' + subName).classList.add('active');
  btn.classList.add('active');
}

// Health: Water & Period
function changeWater(amount) {
  data.water = Math.max(0, data.water + amount);
  saveData();
}
function resetWater() {
  data.water = 0;
  saveData();
}

function logPeriod() {
  const dateVal = document.getElementById('period-date').value;
  if (!dateVal) return;
  data.periodDates.push(dateVal);
  data.periodDates.sort();
  saveData();
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

// Schedules & Auto-Resume
function addScheduleItem() {
  const type = document.getElementById('sched-type').value;
  const name = document.getElementById('sched-name').value.trim();
  const time = document.getElementById('sched-time').value.trim();
  const role = document.getElementById('sched-role').value.trim();
  if (!name) return;
  data.schedules.push({ type, name, time, role });
  document.getElementById('sched-name').value = '';
  document.getElementById('sched-time').value = '';
  document.getElementById('sched-role').value = '';
  saveData();
}

// Books
function addBook() {
  const title = document.getElementById('book-title').value.trim();
  const status = document.getElementById('book-status').value;
  const progress = document.getElementById('book-progress').value.trim();
  if (!title) return;
  data.books.push({ title, status, progress });
  document.getElementById('book-title').value = '';
  document.getElementById('book-progress').value = '';
  saveData();
}

function cycleBookStatus(index) {
  const order = ['To Be Read', 'In Progress', 'Finished'];
  const current = order.indexOf(data.books[index].status);
  data.books[index].status = order[(current + 1) % order.length];
  saveData();
}

// Shows & Movies
function addShow() {
  const title = document.getElementById('show-title').value.trim();
  const type = document.getElementById('show-type').value;
  const status = document.getElementById('show-status').value;
  const note = document.getElementById('show-note').value.trim();
  if (!title) return;
  data.shows.push({ title, type, status, note });
  document.getElementById('show-title').value = '';
  document.getElementById('show-note').value = '';
  saveData();
}

function cycleShowStatus(index) {
  const order = ['Watchlist', 'Watching', 'Finished'];
  const current = order.indexOf(data.shows[index].status);
  data.shows[index].status = order[(current + 1) % order.length];
  saveData();
}

// Projects, Goals, Wish List
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

function addGoal() {
  const input = document.getElementById('goal-input');
  if (!input.value.trim()) return;
  data.goals.push({ text: input.value.trim(), done: false });
  input.value = '';
  saveData();
}

function addWish() {
  const name = document.getElementById('wish-name').value.trim();
  const price = parseFloat(document.getElementById('wish-price').value) || 0;
  if (!name) return;
  data.wishes.push({ name, price });
  document.getElementById('wish-name').value = '';
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

// Render Everything
function renderAll() {
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  document.getElementById('water-count').textContent = data.water;
  document.getElementById('scratchpad').value = data.scratchpad || '';

  // Period prediction (+28 days from last logged date)
  const cycleEl = document.getElementById('cycle-status');
  if (data.periodDates.length > 0) {
    const last = new Date(data.periodDates[data.periodDates.length - 1] + 'T00:00:00');
    const next = new Date(last);
    next.setDate(last.getDate() + 28);
    cycleEl.textContent = `Last: ${last.toLocaleDateString('en-US', {month:'short', day:'numeric'})} | Est. Next: ${next.toLocaleDateString('en-US', {month:'short', day:'numeric'})}`;
  }

  // Todos
  document.getElementById('todo-list').innerHTML = data.todos.map((t, i) => `
    <li>
      <span onclick="toggleTodo(${i})" class="item-info ${t.done ? 'done-text' : ''}">${t.done ? '☑' : '☐'} ${t.text}</span>
      <button class="del-btn" onclick="deleteItem('todos', ${i})">X</button>
    </li>
  `).join('');

  // Schedules & Resume
  const schedHTML = data.schedules.map((s, i) => `
    <li>
      <div class="item-info">
        <div class="item-title">[${s.type}] ${s.name}</div>
        <div class="item-sub">${s.time} ${s.role ? '• ' + s.role : ''}</div>
      </div>
      <button class="del-btn" onclick="deleteItem('schedules', ${i})">X</button>
    </li>
  `).join('');
  document.getElementById('full-schedule-list').innerHTML = schedHTML;
  document.getElementById('today-schedule-list').innerHTML = schedHTML || '<li class="item-sub">No classes or clubs added yet.</li>';

  document.getElementById('resume-classes').innerHTML = data.schedules
    .filter(s => s.type === 'Class')
    .map(s => `<li><strong>${s.name}</strong>${s.role ? ' — ' + s.role : ''}</li>`).join('') || '<li>Add classes in Schedule tab</li>';

  document.getElementById('resume-clubs').innerHTML = data.schedules
    .filter(s => s.type === 'Club')
    .map(s => `<li><strong>${s.name}</strong>${s.role ? ' — ' + s.role : ''}</li>`).join('') || '<li>Add clubs in Schedule tab</li>';

  document.getElementById('resume-projects').innerHTML = data.projects
    .map(p => `<li><strong>${p.name} (${p.category})</strong> — ${p.status}${p.notes ? ': ' + p.notes : ''}</li>`).join('') || '<li>Add projects in Projects tab</li>';

  // Books
  const renderBooks = (status) => data.books
    .map((b, i) => ({ ...b, i }))
    .filter(b => b.status === status)
    .map(b => `
      <li>
        <div class="item-info">
          <div class="item-title">${b.title}</div>
          <div class="item-sub">${b.progress || 'No progress note'}</div>
        </div>
        <button class="btn-small" onclick="cycleBookStatus(${b.i})">Move</button>
        <button class="del-btn" onclick="deleteItem('books', ${b.i})">X</button>
      </li>
    `).join('');
  document.getElementById('books-in-progress').innerHTML = renderBooks('In Progress');
  document.getElementById('books-tbr').innerHTML = renderBooks('To Be Read');
  document.getElementById('books-finished').innerHTML = renderBooks('Finished');

  // Shows & Movies
  const renderShows = (status) => data.shows
    .map((s, i) => ({ ...s, i }))
    .filter(s => s.status === status)
    .map(s => `
      <li>
        <div class="item-info">
          <div class="item-title">${s.title} <span class="badge">${s.type}</span></div>
          <div class="item-sub">${s.note || ''}</div>
        </div>
        <button class="btn-small" onclick="cycleShowStatus(${s.i})">Move</button>
        <button class="del-btn" onclick="deleteItem('shows', ${s.i})">X</button>
      </li>
    `).join('');
  document.getElementById('shows-watching').innerHTML = renderShows('Watching');
  document.getElementById('shows-watchlist').innerHTML = renderShows('Watchlist');
  document.getElementById('shows-finished').innerHTML = renderShows('Finished');

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
    return `
      <li>
        <div class="item-info">
          <div class="item-title">${w.name}</div>
          <div class="item-sub">$${w.price.toFixed(2)}</div>
        </div>
        <button class="del-btn" onclick="deleteItem('wishes', ${i})">X</button>
      </li>
    `;
  }).join('');
  document.getElementById('wish-total').textContent = total.toFixed(2);
}

renderAll();