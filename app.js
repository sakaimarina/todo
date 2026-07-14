const STORAGE_KEY = "todos";

let todos = loadTodos();
let currentFilter = "all";

const todoListEl = document.getElementById("todoList");
const addFormEl = document.getElementById("addForm");
const todoInputEl = document.getElementById("todoInput");
const reminderInputEl = document.getElementById("reminderInput");
const filtersEl = document.getElementById("filters");
const emptyStateEl = document.getElementById("emptyState");
const summaryEl = document.getElementById("summary");
const clearCompletedEl = document.getElementById("clearCompleted");

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function addTodo(text, reminderAt) {
  const trimmed = text.trim();
  if (!trimmed) return;
  todos.unshift({
    id: makeId(),
    text: trimmed,
    completed: false,
    reminderAt: reminderAt || null,
    notified: false,
  });
  saveTodos();
  render();
  if (reminderAt) requestNotificationPermission();
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos();
    render();
  }
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  render();
}

function editTodo(id, newText) {
  const trimmed = newText.trim();
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  if (!trimmed) {
    deleteTodo(id);
    return;
  }
  todo.text = trimmed;
  saveTodos();
  render();
}

function clearCompleted() {
  todos = todos.filter((t) => !t.completed);
  saveTodos();
  render();
}

function getFilteredTodos() {
  if (currentFilter === "active") return todos.filter((t) => !t.completed);
  if (currentFilter === "completed") return todos.filter((t) => t.completed);
  return todos;
}

function render() {
  const filtered = getFilteredTodos();

  todoListEl.innerHTML = "";
  filtered.forEach((todo) => {
    todoListEl.appendChild(renderTodoItem(todo));
  });

  emptyStateEl.classList.toggle("is-visible", filtered.length === 0);

  const activeCount = todos.filter((t) => !t.completed).length;
  summaryEl.textContent = todos.length
    ? `${activeCount}件の未完了 / 全${todos.length}件`
    : "";

  clearCompletedEl.style.visibility = todos.some((t) => t.completed)
    ? "visible"
    : "hidden";
}

function formatReminder(isoString) {
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function renderTodoItem(todo) {
  const li = document.createElement("li");
  li.className = "todo-item" + (todo.completed ? " is-completed" : "");
  li.dataset.id = todo.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "todo-item__checkbox";
  checkbox.checked = todo.completed;
  checkbox.addEventListener("change", () => toggleTodo(todo.id));

  const body = document.createElement("div");
  body.className = "todo-item__body";

  const textSpan = document.createElement("span");
  textSpan.className = "todo-item__text";
  textSpan.textContent = todo.text;
  textSpan.addEventListener("click", () => startEditing(body, todo));
  body.appendChild(textSpan);

  if (todo.reminderAt) {
    const reminderSpan = document.createElement("span");
    const isOverdue = !todo.completed && new Date(todo.reminderAt) <= new Date();
    reminderSpan.className = "todo-item__reminder" + (isOverdue ? " is-overdue" : "");
    reminderSpan.textContent = `🔔 ${formatReminder(todo.reminderAt)}`;
    body.appendChild(reminderSpan);
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "todo-item__delete";
  deleteBtn.textContent = "×";
  deleteBtn.setAttribute("aria-label", "削除");
  deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

  li.appendChild(checkbox);
  li.appendChild(body);
  li.appendChild(deleteBtn);
  return li;
}

function startEditing(body, todo) {
  const textSpan = body.querySelector(".todo-item__text");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "todo-item__edit-input";
  input.value = todo.text;
  input.maxLength = 200;

  body.replaceChild(input, textSpan);
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  const commit = () => editTodo(todo.id, input.value);

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    } else if (e.key === "Escape") {
      input.removeEventListener("blur", commit);
      render();
    }
  });
}

function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function checkReminders() {
  const now = new Date();
  let changed = false;

  todos.forEach((todo) => {
    if (!todo.reminderAt || todo.completed || todo.notified) return;
    if (new Date(todo.reminderAt) > now) return;

    todo.notified = true;
    changed = true;

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("TODOリマインダー", { body: todo.text });
    }
  });

  if (changed) {
    saveTodos();
    render();
  }
}

addFormEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const reminderValue = reminderInputEl.value
    ? new Date(reminderInputEl.value).toISOString()
    : null;
  addTodo(todoInputEl.value, reminderValue);
  todoInputEl.value = "";
  reminderInputEl.value = "";
  todoInputEl.focus();
});

filtersEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  filtersEl.querySelectorAll(".filter-btn").forEach((b) => {
    b.classList.toggle("is-active", b === btn);
  });
  render();
});

clearCompletedEl.addEventListener("click", clearCompleted);

render();
checkReminders();
setInterval(checkReminders, 20000);
