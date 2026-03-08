async function fetchData() {
    const response = await fetch('/api/data');
    const data = await response.json();
    document.getElementById('result').textContent = JSON.stringify(data, null, 2);
}

async function sendData() {
    const response = await fetch('/api/data', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: 'User', value: 42})
    });
    const data = await response.json();
    document.getElementById('result').textContent = JSON.stringify(data, null, 2);
}

async function loadItems() {
    try {
        const response = await fetch('/api/items?page=1&per_page=50');
        const data = await response.json();
        const itemsDiv = document.getElementById('items');
        itemsDiv.innerHTML = data.items.map(item => 
            `<div class="item">
                <span>${escapeHtml(item.text)}</span>
                <button onclick="deleteItem(${item.id})">Delete</button>
            </div>`
        ).join('');
    } catch (error) {
        showError('Failed to load items');
    }
}

async function addItem() {
    const input = document.getElementById('itemInput');
    const text = input.value.trim();
    if (!text) return alert('Please enter item text');
    
    try {
        const response = await fetch('/api/items', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text})
        });
        if (!response.ok) throw new Error('Failed to add item');
        input.value = '';
        loadItems();
    } catch (error) {
        showError('Failed to add item');
    }
}

async function deleteItem(id) {
    await fetch(`/api/items/${id}`, {method: 'DELETE'});
    loadItems();
}

async function searchItems() {
    const query = document.getElementById('searchInput').value;
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = data.results.map(item => 
        `<div class="item">${escapeHtml(item.text)}</div>`
    ).join('') || '<p>No results found</p>';
}

async function clearAll() {
    if (!confirm('Delete all items?')) return;
    await fetch('/api/items/clear', {method: 'DELETE'});
    loadItems();
}

async function registerUser() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    
    const response = await fetch('/api/users', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, email})
    });
    const data = await response.json();
    document.getElementById('userResult').textContent = JSON.stringify(data, null, 2);
}

async function getStats() {
    const response = await fetch('/api/stats');
    const data = await response.json();
    document.getElementById('stats').innerHTML = `
        <p>Total Items: ${data.total_items}</p>
        <p>Total Users: ${data.total_users}</p>
        <p>Total Todos: ${data.total_todos}</p>
        <p>Total Notes: ${data.total_notes}</p>
        <p>Completed Todos: ${data.completed_todos}</p>
        <p>Server Uptime: ${data.uptime}s</p>
    `;
}

async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });
    const data = await response.json();
    document.getElementById('uploadResult').textContent = JSON.stringify(data, null, 2);
}

async function sortItems() {
    const order = document.getElementById('sortOrder').value;
    const response = await fetch(`/api/items/sort?order=${order}`);
    const data = await response.json();
    const itemsDiv = document.getElementById('items');
    itemsDiv.innerHTML = data.items.map(item => 
        `<div class="item">
            <span>${escapeHtml(item.text)}</span>
            <button onclick="deleteItem(${item.id})">Delete</button>
        </div>`
    ).join('');
}

async function addTodo() {
    const text = document.getElementById('todoInput').value.trim();
    const priority = document.getElementById('todoPriority').value;
    if (!text) return;
    
    await fetch('/api/todos', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text, priority})
    });
    document.getElementById('todoInput').value = '';
    loadTodos();
}

async function loadTodos() {
    const response = await fetch('/api/todos');
    const data = await response.json();
    const todosDiv = document.getElementById('todos');
    todosDiv.innerHTML = data.todos.map(todo => 
        `<div class="todo ${todo.completed ? 'completed' : ''} ${todo.priority}">
            <span>${escapeHtml(todo.text)} (${todo.priority})</span>
            <div>
                <button onclick="toggleTodo(${todo.id})">${todo.completed ? 'Undo' : 'Complete'}</button>
                <button onclick="deleteTodo(${todo.id})">Delete</button>
            </div>
        </div>`
    ).join('');
}

async function toggleTodo(id) {
    await fetch(`/api/todos/${id}/toggle`, {method: 'PUT'});
    loadTodos();
}

async function deleteTodo(id) {
    await fetch(`/api/todos/${id}`, {method: 'DELETE'});
    loadTodos();
}

async function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    if (!title || !content) return;
    
    await fetch('/api/notes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({title, content})
    });
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    loadNotes();
}

async function loadNotes() {
    const response = await fetch('/api/notes');
    const data = await response.json();
    const notesDiv = document.getElementById('notes');
    notesDiv.innerHTML = data.notes.map(note => 
        `<div class="note">
            <h3>${escapeHtml(note.title)}</h3>
            <p>${escapeHtml(note.content)}</p>
            <small>${new Date(note.created).toLocaleString()}</small>
            <button onclick="deleteNote(${note.id})">Delete</button>
        </div>`
    ).join('');
}

async function deleteNote(id) {
    await fetch(`/api/notes/${id}`, {method: 'DELETE'});
    loadNotes();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    alert(message);
}

async function filterTodos() {
    const status = document.getElementById('filterStatus').value;
    const priority = document.getElementById('filterPriority').value;
    
    const response = await fetch(`/api/todos/filter?status=${status}&priority=${priority}`);
    const data = await response.json();
    const todosDiv = document.getElementById('todos');
    todosDiv.innerHTML = data.todos.map(todo => 
        `<div class="todo ${todo.completed ? 'completed' : ''} ${todo.priority}">
            <span>${escapeHtml(todo.text)} (${todo.priority})</span>
            <div>
                <button onclick="toggleTodo(${todo.id})">${todo.completed ? 'Undo' : 'Complete'}</button>
                <button onclick="deleteTodo(${todo.id})">Delete</button>
            </div>
        </div>`
    ).join('');
}

async function exportData() {
    const response = await fetch('/api/export');
    const data = await response.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

window.onload = () => {
    loadItems();
    loadTodos();
    loadNotes();
};
