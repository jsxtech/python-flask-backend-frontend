from flask import Flask, render_template, jsonify, request, make_response
from flask_cors import CORS
from datetime import datetime
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
import os
import re
import time
import logging
import threading

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# In-memory storage with thread lock
lock = threading.Lock()
items = []
users = []
todos = []
notes = []
item_id = 0
user_id = 0
todo_id = 0
note_id = 0
start_time = time.time()

# Simple email regex for validation
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'}


# --- Error Handlers ---

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': 'File too large. Maximum size is 16MB'}), 413


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


# --- Routes ---

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify({'message': 'Hello from Flask!', 'status': 'success'})


@app.route('/api/data', methods=['POST'])
def post_data():
    if not request.is_json:
        return jsonify({'error': 'Request must be JSON'}), 400
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON body'}), 400
    return jsonify({'received': data, 'status': 'success'})


@app.route('/api/items', methods=['GET'])
def get_items():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    if per_page <= 0 or per_page > 100:
        per_page = 10
    if page < 1:
        page = 1

    with lock:
        total = len(items)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_items = items[start:end]

    return jsonify({
        'items': paginated_items,
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': max(1, (total + per_page - 1) // per_page)
    })


@app.route('/api/items', methods=['POST'])
def add_item():
    global item_id

    if not request.is_json:
        return jsonify({'error': 'Request must be JSON'}), 400
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON body'}), 400
    if not isinstance(data, dict):
        return jsonify({'error': 'Request body must be a JSON object'}), 400

    text = data.get('text', '')
    if not isinstance(text, str):
        return jsonify({'error': 'Text must be a string'}), 400
    text = text.strip()

    if not text:
        return jsonify({'error': 'Text is required'}), 400
    if len(text) > 500:
        return jsonify({'error': 'Text too long (max 500 characters)'}), 400

    with lock:
        item = {
            'id': item_id,
            'text': text,
            'created': datetime.now().isoformat()
        }
        items.append(item)
        item_id += 1

    return jsonify(item), 201


@app.route('/api/items/<int:id>', methods=['DELETE'])
def delete_item(id):
    with lock:
        original_len = len(items)
        filtered = [item for item in items if item['id'] != id]
        if len(filtered) == original_len:
            return jsonify({'error': 'Item not found'}), 404
        items.clear()
        items.extend(filtered)
    return jsonify({'status': 'deleted', 'id': id})


@app.route('/api/items/clear', methods=['DELETE'])
def clear_items():
    with lock:
        items.clear()
    return jsonify({'status': 'cleared'})


@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('q', '').strip().lower()
    if not query:
        return jsonify({'results': [], 'count': 0})
    with lock:
        results = [item for item in items if query in item['text'].lower()]
    return jsonify({'results': results, 'count': len(results)})


@app.route('/api/items/sort', methods=['GET'])
def sort_items():
    order = request.args.get('order', 'newest')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)

    if per_page <= 0 or per_page > 100:
        per_page = 50
    if page < 1:
        page = 1

    with lock:
        sorted_items = items.copy()

    if order == 'oldest':
        sorted_items.sort(key=lambda x: x['created'])
    elif order == 'alpha':
        sorted_items.sort(key=lambda x: x['text'].lower())
    else:  # newest
        sorted_items.sort(key=lambda x: x['created'], reverse=True)

    total = len(sorted_items)
    start = (page - 1) * per_page
    end = start + per_page
    paginated = sorted_items[start:end]

    return jsonify({
        'items': paginated,
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': max(1, (total + per_page - 1) // per_page)
    })


@app.route('/api/todos', methods=['GET'])
def get_todos():
    with lock:
        return jsonify({'todos': todos.copy(), 'count': len(todos)})


@app.route('/api/todos', methods=['POST'])
def add_todo():
    global todo_id

    if not request.is_json:
        return jsonify({'error': 'Request must be JSON'}), 400
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON body'}), 400
    if not isinstance(data, dict):
        return jsonify({'error': 'Request body must be a JSON object'}), 400

    text = data.get('text', '')
    priority = data.get('priority', 'medium')

    if not isinstance(text, str):
        return jsonify({'error': 'Text must be a string'}), 400
    if not isinstance(priority, str):
        return jsonify({'error': 'Priority must be a string'}), 400
    text = text.strip()

    if not text:
        return jsonify({'error': 'Text is required'}), 400
    if len(text) > 500:
        return jsonify({'error': 'Text too long (max 500 characters)'}), 400
    if priority not in ['low', 'medium', 'high']:
        return jsonify({'error': 'Invalid priority. Must be low, medium, or high'}), 400

    with lock:
        todo = {
            'id': todo_id,
            'text': text,
            'priority': priority,
            'completed': False,
            'created': datetime.now().isoformat()
        }
        todos.append(todo)
        todo_id += 1

    return jsonify(todo), 201


@app.route('/api/todos/<int:id>/toggle', methods=['PUT'])
def toggle_todo(id):
    with lock:
        for todo in todos:
            if todo['id'] == id:
                todo['completed'] = not todo['completed']
                return jsonify(todo)
    return jsonify({'error': 'Todo not found'}), 404


@app.route('/api/todos/<int:id>', methods=['DELETE'])
def delete_todo(id):
    with lock:
        original_len = len(todos)
        filtered = [todo for todo in todos if todo['id'] != id]
        if len(filtered) == original_len:
            return jsonify({'error': 'Todo not found'}), 404
        todos.clear()
        todos.extend(filtered)
    return jsonify({'status': 'deleted', 'id': id})


@app.route('/api/todos/filter', methods=['GET'])
def filter_todos():
    status = request.args.get('status', 'all')
    priority = request.args.get('priority', 'all')

    if status not in ['all', 'active', 'completed']:
        return jsonify({'error': 'Invalid status. Must be all, active, or completed'}), 400
    if priority not in ['all', 'low', 'medium', 'high']:
        return jsonify({'error': 'Invalid priority. Must be all, low, medium, or high'}), 400

    with lock:
        filtered = todos.copy()

    if status == 'active':
        filtered = [t for t in filtered if not t['completed']]
    elif status == 'completed':
        filtered = [t for t in filtered if t['completed']]

    if priority != 'all':
        filtered = [t for t in filtered if t['priority'] == priority]

    return jsonify({'todos': filtered, 'count': len(filtered)})


@app.route('/api/export', methods=['GET'])
def export_data():
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    with lock:
        data = {
            'items': items.copy(),
            'todos': todos.copy(),
            'notes': notes.copy(),
            'users': [{'id': u['id'], 'username': u['username'], 'registered': u['registered']} for u in users],
            'exported_at': datetime.now().isoformat()
        }

    response = make_response(jsonify(data))
    response.headers['Content-Disposition'] = f'attachment; filename=export_{timestamp}.json'
    response.headers['Content-Type'] = 'application/json'
    return response


@app.route('/api/notes', methods=['GET'])
def get_notes():
    with lock:
        return jsonify({'notes': notes.copy(), 'count': len(notes)})


@app.route('/api/notes', methods=['POST'])
def add_note():
    global note_id

    if not request.is_json:
        return jsonify({'error': 'Request must be JSON'}), 400
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON body'}), 400
    if not isinstance(data, dict):
        return jsonify({'error': 'Request body must be a JSON object'}), 400

    title = data.get('title', '')
    content = data.get('content', '')

    if not isinstance(title, str) or not isinstance(content, str):
        return jsonify({'error': 'Title and content must be strings'}), 400
    title = title.strip()
    content = content.strip()

    if not title or not content:
        return jsonify({'error': 'Title and content are required'}), 400
    if len(title) > 200:
        return jsonify({'error': 'Title too long (max 200 characters)'}), 400
    if len(content) > 5000:
        return jsonify({'error': 'Content too long (max 5000 characters)'}), 400

    with lock:
        note = {
            'id': note_id,
            'title': title,
            'content': content,
            'created': datetime.now().isoformat()
        }
        notes.append(note)
        note_id += 1

    return jsonify(note), 201


@app.route('/api/notes/<int:id>', methods=['DELETE'])
def delete_note(id):
    with lock:
        original_len = len(notes)
        filtered = [note for note in notes if note['id'] != id]
        if len(filtered) == original_len:
            return jsonify({'error': 'Note not found'}), 404
        notes.clear()
        notes.extend(filtered)
    return jsonify({'status': 'deleted', 'id': id})


@app.route('/api/users', methods=['GET'])
def get_users():
    with lock:
        public_users = [{'id': u['id'], 'username': u['username'], 'registered': u['registered']} for u in users]
    return jsonify({'users': public_users, 'count': len(public_users)})


@app.route('/api/users', methods=['POST'])
def add_user():
    global user_id

    if not request.is_json:
        return jsonify({'error': 'Request must be JSON'}), 400
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON body'}), 400
    if not isinstance(data, dict):
        return jsonify({'error': 'Request body must be a JSON object'}), 400

    username = data.get('username', '')
    email = data.get('email', '')

    if not isinstance(username, str) or not isinstance(email, str):
        return jsonify({'error': 'Username and email must be strings'}), 400
    username = username.strip()
    email = email.strip()

    if not username or not email:
        return jsonify({'error': 'Username and email are required'}), 400
    if len(username) > 100:
        return jsonify({'error': 'Username too long (max 100 characters)'}), 400
    if not EMAIL_REGEX.match(email):
        return jsonify({'error': 'Invalid email format'}), 400

    with lock:
        # Check for duplicate username or email
        for user in users:
            if user['username'] == username:
                return jsonify({'error': 'Username already exists'}), 400
            if user['email'] == email:
                return jsonify({'error': 'Email already registered'}), 400

        user = {
            'id': user_id,
            'username': username,
            'email': email,
            'registered': datetime.now().isoformat()
        }
        users.append(user)
        user_id += 1

    return jsonify(user), 201


@app.route('/api/stats', methods=['GET'])
def get_stats():
    with lock:
        return jsonify({
            'total_items': len(items),
            'total_users': len(users),
            'total_todos': len(todos),
            'total_notes': len(notes),
            'completed_todos': len([t for t in todos if t['completed']]),
            'uptime': round(time.time() - start_time, 2)
        })


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    filename = secure_filename(file.filename)
    if not filename:
        return jsonify({'error': 'Invalid filename'}), 400

    # Validate extension AFTER secure_filename to prevent mismatch
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({'error': 'File type not allowed. Allowed: txt, pdf, png, jpg, jpeg, gif, doc, docx'}), 400

    # Add timestamp to prevent overwrites
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    if '.' in filename:
        name, extension = filename.rsplit('.', 1)
        unique_filename = f"{name}_{timestamp}.{extension}"
    else:
        unique_filename = f"{filename}_{timestamp}"

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
    file.save(filepath)

    return jsonify({
        'status': 'uploaded',
        'filename': unique_filename,
        'size': os.path.getsize(filepath)
    }), 201


if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(debug=debug)
