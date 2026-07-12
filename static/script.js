// Utility: show a loading indicator in a target element.
// Call setLoading(id, true) before async work.
// On success: directly write new innerHTML (setLoading(id, false) in finally is a safe no-op).
// On error: setLoading(id, false) in finally restores previous content.
function setLoading(elementId, loading) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (loading) {
        el.dataset.loadingPrev = el.innerHTML;
        el.innerHTML = '<p class="loading">Loading...</p>';
    } else {
        // Only restore if the loading indicator is still showing (error path).
        // If success path already wrote new content, innerHTML won't match.
        const loadingHtml = '<p class="loading">Loading...</p>';
        if (el.innerHTML === loadingHtml && el.dataset.loadingPrev !== undefined) {
            el.innerHTML = el.dataset.loadingPrev;
        }
        delete el.dataset.loadingPrev;
    }
}

// Utility: disable/enable a button during an operation
function setButtonLoading(button, loading) {
    if (!button) return;
    button.disabled = loading;
    if (loading) {
        button.dataset.originalText = button.textContent;
        button.textContent = 'Loading...';
    } else if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
    }
}

// State: track current items sort order so deletes preserve it
let currentSortOrder = null;

// State: abort controller for todo operations to prevent races
let todoAbortController = null;

async function fetchData() {
    const resultEl = document.getElementById('result');
    try {
        setLoading('result', true);
        const response = await fetch('/api/data');
        const data = await response.json();
        resultEl.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        showError('Failed to fetch data');
        resultEl.textContent = '';
    } finally {
        setLoading('result', false);
    }
}

async function sendData() {
    const resultEl = document.getElementById('result');
    try {
        setLoading('result', true);
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: 'User', value: 42})
        });
        const data = await response.json();
        resultEl.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        showError('Failed to send data');
        resultEl.textContent = '';
    } finally {
        setLoading('result', false);
    }
}

async function loadItems() {
    try {
        setLoading('items', true);
        // If a sort order is active, fetch sorted; otherwise fetch default order
        let url = '/api/items?page=1&per_page=50';
        if (currentSortOrder) {
            url = `/api/items/sort?order=${currentSortOrder}&per_page=50`;
        }
        const response = await fetch(url);
        const data = await response.json();
        const itemsDiv = document.getElementById('items');
        itemsDiv.innerHTML = data.items.map(item =>
            `<div class="item" role="listitem">
                <span>${escapeHtml(item.text)}</span>
                <button onclick="deleteItem(${item.id})" aria-label="${escapeAttr('Delete item: ' + item.text)}">Delete</button>
            </div>`
        ).join('');
    } catch (error) {
        showError('Failed to load items');
    } finally {
        setLoading('items', false);
    }
}

async function addItem() {
    const input = document.getElementById('itemInput');
    const text = input.value.trim();
    if (!text) return showError('Please enter item text');

    try {
        const response = await fetch('/api/items', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text})
        });
        const data = await response.json();
        if (!response.ok) {
            showError(data.error || 'Failed to add item');
            return;
        }
        input.value = '';
        showSuccess('Item added');
        loadItems();
    } catch (error) {
        showError('Failed to add item');
    }
}

async function deleteItem(id) {
    try {
        const response = await fetch(`/api/items/${id}`, {method: 'DELETE'});
        if (!response.ok) {
            const data = await response.json();
            showError(data.error || 'Failed to delete item');
            return;
        }
        loadItems();
    } catch (error) {
        showError('Failed to delete item');
    }
}

async function searchItems() {
    const query = document.getElementById('searchInput').value.trim();
    const resultsDiv = document.getElementById('searchResults');
    if (!query) {
        resultsDiv.innerHTML = '<p>Enter a search term</p>';
        return;
    }
    try {
        setLoading('searchResults', true);
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        resultsDiv.innerHTML = data.results.map(item =>
            `<div class="item">${escapeHtml(item.text)}</div>`
        ).join('') || '<p>No results found</p>';
    } catch (error) {
        showError('Failed to search items');
        resultsDiv.innerHTML = '';
    } finally {
        setLoading('searchResults', false);
    }
}

async function clearAll() {
    if (!confirm('Delete all items?')) return;
    try {
        const response = await fetch('/api/items/clear', {method: 'DELETE'});
        if (!response.ok) {
            showError('Failed to clear items');
            return;
        }
        showSuccess('All items cleared');
        loadItems();
    } catch (error) {
        showError('Failed to clear items');
    }
}

async function registerUser() {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const resultEl = document.getElementById('userResult');

    if (!username || !email) return showError('Username and email are required');

    try {
        setLoading('userResult', true);
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, email})
        });
        const data = await response.json();
        if (!response.ok) {
            resultEl.textContent = '';
            showError(data.error || 'Failed to register user');
            return;
        }
        resultEl.textContent = JSON.stringify(data, null, 2);
        document.getElementById('username').value = '';
        document.getElementById('email').value = '';
        showSuccess('User registered');
    } catch (error) {
        showError('Failed to register user');
        resultEl.textContent = '';
    } finally {
        setLoading('userResult', false);
    }
}

async function getStats() {
    try {
        setLoading('stats', true);
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
    } catch (error) {
        showError('Failed to load statistics');
        document.getElementById('stats').innerHTML = '';
    } finally {
        setLoading('stats', false);
    }
}

async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) return showError('Please select a file');

    const resultEl = document.getElementById('uploadResult');
    try {
        setLoading('uploadResult', true);
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            let errorMsg = 'Failed to upload file';
            try {
                const data = await response.json();
                errorMsg = data.error || errorMsg;
            } catch (e) {
                if (response.status === 413) errorMsg = 'File too large. Maximum size is 16MB';
            }
            resultEl.textContent = '';
            showError(errorMsg);
            return;
        }
        const data = await response.json();
        resultEl.textContent = JSON.stringify(data, null, 2);
        fileInput.value = '';
        showSuccess('File uploaded');
    } catch (error) {
        showError('Failed to upload file');
        resultEl.textContent = '';
    } finally {
        setLoading('uploadResult', false);
    }
}

async function sortItems() {
    const order = document.getElementById('sortOrder').value;
    currentSortOrder = order;
    try {
        setLoading('items', true);
        const response = await fetch(`/api/items/sort?order=${order}&per_page=50`);
        const data = await response.json();
        const itemsDiv = document.getElementById('items');
        itemsDiv.innerHTML = data.items.map(item =>
            `<div class="item" role="listitem">
                <span>${escapeHtml(item.text)}</span>
                <button onclick="deleteItem(${item.id})" aria-label="${escapeAttr('Delete item: ' + item.text)}">Delete</button>
            </div>`
        ).join('');
    } catch (error) {
        showError('Failed to sort items');
    } finally {
        setLoading('items', false);
    }
}

async function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    const priority = document.getElementById('todoPriority').value;
    if (!text) return showError('Please enter todo text');

    try {
        const response = await fetch('/api/todos', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text, priority})
        });
        const data = await response.json();
        if (!response.ok) {
            showError(data.error || 'Failed to add todo');
            return;
        }
        input.value = '';
        showSuccess('Todo added');
        refreshTodos();
    } catch (error) {
        showError('Failed to add todo');
    }
}

// Refresh todos respecting current filter state
function refreshTodos() {
    const status = document.getElementById('filterStatus').value;
    const priority = document.getElementById('filterPriority').value;
    if (status !== 'all' || priority !== 'all') {
        filterTodos();
    } else {
        loadTodos();
    }
}

async function loadTodos() {
    // Cancel any in-flight todo fetch to prevent race conditions
    if (todoAbortController) todoAbortController.abort();
    todoAbortController = new AbortController();

    try {
        setLoading('todos', true);
        const response = await fetch('/api/todos', {signal: todoAbortController.signal});
        const data = await response.json();
        const todosDiv = document.getElementById('todos');
        todosDiv.innerHTML = data.todos.map(todo =>
            `<div class="todo ${todo.completed ? 'completed' : ''} ${todo.priority}" role="listitem">
                <span>${escapeHtml(todo.text)} (${todo.priority})</span>
                <div>
                    <button onclick="toggleTodo(${todo.id})" aria-label="${escapeAttr((todo.completed ? 'Mark incomplete: ' : 'Mark complete: ') + todo.text)}">${todo.completed ? 'Undo' : 'Complete'}</button>
                    <button onclick="deleteTodo(${todo.id})" aria-label="${escapeAttr('Delete todo: ' + todo.text)}">Delete</button>
                </div>
            </div>`
        ).join('');
    } catch (error) {
        if (error.name === 'AbortError') return;
        showError('Failed to load todos');
    } finally {
        setLoading('todos', false);
    }
}

async function toggleTodo(id) {
    try {
        const response = await fetch(`/api/todos/${id}/toggle`, {method: 'PUT'});
        if (!response.ok) {
            const data = await response.json();
            showError(data.error || 'Failed to toggle todo');
            return;
        }
        refreshTodos();
    } catch (error) {
        showError('Failed to toggle todo');
    }
}

async function deleteTodo(id) {
    try {
        const response = await fetch(`/api/todos/${id}`, {method: 'DELETE'});
        if (!response.ok) {
            const data = await response.json();
            showError(data.error || 'Failed to delete todo');
            return;
        }
        refreshTodos();
    } catch (error) {
        showError('Failed to delete todo');
    }
}

async function saveNote() {
    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteContent');
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    if (!title || !content) return showError('Title and content are required');

    try {
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title, content})
        });
        const data = await response.json();
        if (!response.ok) {
            showError(data.error || 'Failed to save note');
            return;
        }
        titleInput.value = '';
        contentInput.value = '';
        showSuccess('Note saved');
        loadNotes();
    } catch (error) {
        showError('Failed to save note');
    }
}

async function loadNotes() {
    try {
        setLoading('notes', true);
        const response = await fetch('/api/notes');
        const data = await response.json();
        const notesDiv = document.getElementById('notes');
        notesDiv.innerHTML = data.notes.map(note =>
            `<div class="note" role="listitem">
                <h3>${escapeHtml(note.title)}</h3>
                <p>${escapeHtml(note.content)}</p>
                <small>${new Date(note.created).toLocaleString()}</small>
                <button onclick="deleteNote(${note.id})" aria-label="${escapeAttr('Delete note: ' + note.title)}">Delete</button>
            </div>`
        ).join('');
    } catch (error) {
        showError('Failed to load notes');
    } finally {
        setLoading('notes', false);
    }
}

async function deleteNote(id) {
    try {
        const response = await fetch(`/api/notes/${id}`, {method: 'DELETE'});
        if (!response.ok) {
            const data = await response.json();
            showError(data.error || 'Failed to delete note');
            return;
        }
        loadNotes();
    } catch (error) {
        showError('Failed to delete note');
    }
}

// Escape HTML for text content (prevents tag injection)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Escape for use in HTML attribute values (prevents attribute breakout)
function escapeAttr(text) {
    return escapeHtml(text)
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showError(message) {
    showToast(message, 'error');
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showToast(message, type) {
    const existing = document.querySelector(`.toast-${type}`);
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
}

async function filterTodos() {
    const status = document.getElementById('filterStatus').value;
    const priority = document.getElementById('filterPriority').value;

    // Cancel any in-flight todo fetch to prevent race conditions
    if (todoAbortController) todoAbortController.abort();
    todoAbortController = new AbortController();

    try {
        setLoading('todos', true);
        const response = await fetch(`/api/todos/filter?status=${status}&priority=${priority}`, {
            signal: todoAbortController.signal
        });
        const data = await response.json();
        if (!response.ok) {
            showError(data.error || 'Failed to filter todos');
            return;
        }
        const todosDiv = document.getElementById('todos');
        todosDiv.innerHTML = data.todos.map(todo =>
            `<div class="todo ${todo.completed ? 'completed' : ''} ${todo.priority}" role="listitem">
                <span>${escapeHtml(todo.text)} (${todo.priority})</span>
                <div>
                    <button onclick="toggleTodo(${todo.id})" aria-label="${escapeAttr((todo.completed ? 'Mark incomplete: ' : 'Mark complete: ') + todo.text)}">${todo.completed ? 'Undo' : 'Complete'}</button>
                    <button onclick="deleteTodo(${todo.id})" aria-label="${escapeAttr('Delete todo: ' + todo.text)}">Delete</button>
                </div>
            </div>`
        ).join('');
    } catch (error) {
        if (error.name === 'AbortError') return; // Superseded by newer request
        showError('Failed to filter todos');
    } finally {
        setLoading('todos', false);
    }
}

async function exportData() {
    try {
        const response = await fetch('/api/export');
        if (!response.ok) {
            showError('Failed to export data');
            return;
        }

        // Use server-provided filename from Content-Disposition header
        let filename = `export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const disposition = response.headers.get('Content-Disposition');
        if (disposition) {
            const match = disposition.match(/filename=(.+)/);
            if (match) filename = match[1];
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showSuccess('Data exported');
    } catch (error) {
        showError('Failed to export data');
    }
}

window.onload = () => {
    loadItems();
    loadTodos();
    loadNotes();
};
