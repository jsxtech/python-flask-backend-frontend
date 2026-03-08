from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from datetime import datetime
from werkzeug.utils import secure_filename
import os
import time
import logging

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# In-memory storage
items = []
users = []
todos = []
notes = []
item_id = 0
user_id = 0
todo_id = 0
note_id = 0
start_time = time.time()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify({'message': 'Hello from Flask!', 'status': 'success'})

@app.route('/api/data', methods=['POST'])
def post_data():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400
    return jsonify({'received': data, 'status': 'success'})

@app.route('/api/items', methods=['GET'])
def get_items():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    if per_page <= 0 or per_page > 100:
        per_page = 10
    if page < 1:
        page = 1
    
    start = (page - 1) * per_page
    end = start + per_page
    
    paginated_items = items[start:end]
    
    return jsonify({
        'items': paginated_items,
        'total': len(items),
        'page': page,
        'per_page': per_page,
        'pages': max(1, (len(items) + per_page - 1) // per_page)
    })

@app.route('/api/items', methods=['POST'])
def add_item():
    global item_id
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400
    
    text = data.get('text', '').strip()
    
    if not text:
        return jsonify({'error': 'Text is required'}), 400
    if len(text) > 500:
        return jsonify({'error': 'Text too long'}), 400
    
    item = {
        'id': item_id,
        'text': text,
        'created': datetime.now().isoformat()
    }
    items.append(item)
    item_id += 1
    return jsonify(item)

@app.route('/api/items/<int:id>', methods=['DELETE'])
def delete_item(id):
    global items
    items = [item for item in items if item['id'] != id]
    return jsonify({'status': 'deleted', 'id': id})

@app.route('/api/items/clear', methods=['DELETE'])
def clear_items():
    global items
    items = []
    return jsonify({'status': 'cleared'})

@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('q', '').lower()
    results = [item for item in items if query in item['text'].lower()]
    return jsonify({'results': results, 'count': len(results)})

@app.route('/api/items/sort', methods=['GET'])
def sort_items():
    order = request.args.get('order', 'newest')
    sorted_items = items.copy()
    
    if order == 'oldest':
        sorted_items.sort(key=lambda x: x['created'])
    elif order == 'alpha':
        sorted_items.sort(key=lambda x: x['text'].lower())
    else:  # newest
        sorted_items.sort(key=lambda x: x['created'], reverse=True)
    
    return jsonify({'items': sorted_items})

@app.route('/api/todos', methods=['GET'])
def get_todos():
    return jsonify({'todos': todos, 'count': len(todos)})

@app.route('/api/todos', methods=['POST'])
def add_todo():
    global todo_id
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400
    
    text = data.get('text', '').strip()
    priority = data.get('priority', 'medium')
    
    if not text:
        return jsonify({'error': 'Text is required'}), 400
    if priority not in ['low', 'medium', 'high']:
        return jsonify({'error': 'Invalid priority'}), 400
    
    todo = {
        'id': todo_id,
        'text': text,
        'priority': priority,
        'completed': False,
        'created': datetime.now().isoformat()
    }
    todos.append(todo)
    todo_id += 1
    return jsonify(todo)

@app.route('/api/todos/<int:id>/toggle', methods=['PUT'])
def toggle_todo(id):
    for todo in todos:
        if todo['id'] == id:
            todo['completed'] = not todo['completed']
            return jsonify(todo)
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/todos/<int:id>', methods=['DELETE'])
def delete_todo(id):
    global todos
    todos = [todo for todo in todos if todo['id'] != id]
    return jsonify({'status': 'deleted'})

@app.route('/api/todos/filter', methods=['GET'])
def filter_todos():
    status = request.args.get('status', 'all')
    priority = request.args.get('priority', 'all')
    
    if status not in ['all', 'active', 'completed']:
        return jsonify({'error': 'Invalid status'}), 400
    if priority not in ['all', 'low', 'medium', 'high']:
        return jsonify({'error': 'Invalid priority'}), 400
    
    filtered = todos
    
    if status == 'active':
        filtered = [t for t in filtered if not t['completed']]
    elif status == 'completed':
        filtered = [t for t in filtered if t['completed']]
    
    if priority != 'all':
        filtered = [t for t in filtered if t['priority'] == priority]
    
    return jsonify({'todos': filtered, 'count': len(filtered)})

@app.route('/api/export', methods=['GET'])
def export_data():
    return jsonify({
        'items': items,
        'todos': todos,
        'notes': notes,
        'users': users,
        'exported_at': datetime.now().isoformat()
    })

@app.route('/api/notes', methods=['GET'])
def get_notes():
    return jsonify({'notes': notes, 'count': len(notes)})

@app.route('/api/notes', methods=['POST'])
def add_note():
    global note_id
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400
    
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    
    if not title or not content:
        return jsonify({'error': 'Title and content required'}), 400
    if len(title) > 200 or len(content) > 5000:
        return jsonify({'error': 'Text too long'}), 400
    
    note = {
        'id': note_id,
        'title': title,
        'content': content,
        'created': datetime.now().isoformat()
    }
    notes.append(note)
    note_id += 1
    return jsonify(note)

@app.route('/api/notes/<int:id>', methods=['DELETE'])
def delete_note(id):
    global notes
    notes = [note for note in notes if note['id'] != id]
    return jsonify({'status': 'deleted'})

@app.route('/api/users', methods=['GET'])
def get_users():
    return jsonify({'users': users, 'count': len(users)})

@app.route('/api/users', methods=['POST'])
def add_user():
    global user_id
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Invalid JSON'}), 400
    
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    
    if not username or not email:
        return jsonify({'error': 'Username and email required'}), 400
    if '@' not in email:
        return jsonify({'error': 'Invalid email'}), 400
    
    user = {
        'id': user_id,
        'username': username,
        'email': email,
        'registered': datetime.now().isoformat()
    }
    users.append(user)
    user_id += 1
    return jsonify(user)

@app.route('/api/stats', methods=['GET'])
def get_stats():
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
        return jsonify({'error': 'No file'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    allowed_extensions = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'}
    ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    
    if ext not in allowed_extensions:
        return jsonify({'error': 'File type not allowed'}), 400
    
    filename = secure_filename(file.filename)
    # Add timestamp to prevent overwrites
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    name, extension = filename.rsplit('.', 1) if '.' in filename else (filename, '')
    unique_filename = f"{name}_{timestamp}.{extension}" if extension else f"{filename}_{timestamp}"
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
    file.save(filepath)
    
    return jsonify({
        'status': 'uploaded',
        'filename': unique_filename,
        'size': os.path.getsize(filepath)
    })

if __name__ == '__main__':
    app.run(debug=True)
