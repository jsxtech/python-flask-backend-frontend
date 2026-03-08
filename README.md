# Flask Backend + Frontend Application

> **⚠️ IMPORTANT**: This is a sample/demo application for learning purposes only. It is NOT production-ready. This example demonstrates a Python Flask backend with a Jinja2 template frontend.

A full-stack web application built with Flask backend and vanilla JavaScript frontend.

## Features

### 1. API Testing
- **GET /api/data** - Fetch sample data
- **POST /api/data** - Send and receive JSON data

### 2. Item Manager
- Add, view, and delete items
- Clear all items at once
- Search items by text (case-insensitive)
- Sort items by:
  - Newest first
  - Oldest first
  - Alphabetical order
- Input validation (max 500 characters)
- Pagination support (configurable page size)

### 3. Todo List
- Create todos with priority levels (low, medium, high)
- Mark todos as complete/incomplete
- Color-coded priority indicators:
  - Red border = High priority
  - Yellow border = Medium priority
  - Green border = Low priority
- Delete individual todos
- Priority validation on backend
- Filter by status (all, active, completed)
- Filter by priority (all, high, medium, low)

### 4. Notes System
- Create notes with title and content
- View all notes with timestamps
- Delete notes
- Input validation (title max 200 chars, content max 5000 chars)

### 5. User Registration
- Register users with username and email
- Store user data with registration timestamp
- Email format validation

### 6. Statistics Dashboard
- Total items count
- Total users count
- Total todos count
- Total notes count
- Completed todos count
- Server uptime tracking

### 7. File Upload
- Upload files (max 16MB)
- Allowed file types: txt, pdf, png, jpg, jpeg, gif, doc, docx
- Files saved to `uploads/` directory
- Returns file information (name, size)
- Unique filenames with timestamps to prevent overwrites

### 8. Security Features
- **XSS Protection**: All user input is escaped before display
- **Input Validation**: Backend validation for all endpoints
- **JSON Validation**: All POST endpoints validate JSON payloads
- **Error Handling**: Try-catch blocks for API calls
- **File Type Restrictions**: Only allowed extensions accepted
- **Length Limits**: Maximum character limits enforced
- **CORS Support**: Cross-origin resource sharing enabled

### 9. Data Export
- Export all data (items, todos, notes, users) as JSON
- Download with timestamp
- Includes export metadata

## Installation

```bash
# Install dependencies
pip install -r requirements.txt
```

## Usage

```bash
# Run the application
python app.py
```

Visit `http://localhost:5000` in your browser.

## API Endpoints

### Items
- `GET /api/items?page=1&per_page=10` - List items (paginated)
- `POST /api/items` - Create item (body: `{text}`)
- `DELETE /api/items/<id>` - Delete item
- `DELETE /api/items/clear` - Clear all items
- `GET /api/items/sort?order=newest|oldest|alpha` - Sort items
- `GET /api/search?q=query` - Search items

### Todos
- `GET /api/todos` - List all todos
- `POST /api/todos` - Create todo (body: `{text, priority}`)
- `PUT /api/todos/<id>/toggle` - Toggle completion status
- `DELETE /api/todos/<id>` - Delete todo
- `GET /api/todos/filter?status=active&priority=high` - Filter todos

### Notes
- `GET /api/notes` - List all notes
- `POST /api/notes` - Create note (body: `{title, content}`)
- `DELETE /api/notes/<id>` - Delete note

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Register user (body: `{username, email}`)

### Other
- `GET /api/stats` - Get application statistics
- `POST /api/upload` - Upload file (multipart/form-data)
- `GET /api/export` - Export all data as JSON

## Validation Rules

### Items
- Text: Required, max 500 characters

### Todos
- Text: Required
- Priority: Must be 'low', 'medium', or 'high'

### Notes
- Title: Required, max 200 characters
- Content: Required, max 5000 characters

### Users
- Username: Required
- Email: Required, must contain '@'

### File Upload
- Max size: 16MB
- Allowed extensions: txt, pdf, png, jpg, jpeg, gif, doc, docx

## Pagination

Items endpoint supports pagination:
- `page` - Page number (default: 1, min: 1)
- `per_page` - Items per page (default: 10, range: 1-100)

Response includes:
- `items` - Array of items
- `total` - Total item count
- `page` - Current page
- `per_page` - Items per page
- `pages` - Total pages

## Filtering

Todos can be filtered by:
- `status` - all, active, completed
- `priority` - all, low, medium, high

Example: `/api/todos/filter?status=active&priority=high`

## Error Responses

All endpoints return appropriate HTTP status codes:
- `200` - Success
- `400` - Bad request (validation error)
- `404` - Not found

Error format:
```json
{
  "error": "Error message description"
}
```

## Project Structure

```
python-flask-backend-frontend/
├── app.py                 # Flask backend
├── requirements.txt       # Python dependencies
├── README.md             # Documentation
├── templates/
│   └── index.html        # Frontend HTML
├── static/
│   ├── script.js         # Frontend JavaScript
│   └── style.css         # Frontend styling
└── uploads/              # Uploaded files directory
```

## Technologies

- **Backend**: Flask 3.0.0, Python
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Storage**: In-memory (data resets on server restart)
- **Security**: XSS protection, input validation, file type restrictions, CORS
- **Logging**: Basic request logging for debugging

## Security Features

- **XSS Prevention**: HTML escaping for all user-generated content
- **Input Validation**: Server-side validation for all inputs
- **JSON Validation**: All POST endpoints validate JSON payloads
- **File Upload Security**: Filename sanitization, type restrictions, unique naming
- **Error Handling**: Graceful error handling with user feedback
- **CORS**: Enabled for cross-origin API access
- **Pagination Limits**: Max 100 items per page to prevent abuse

## Notes

- **This is a sample/demo application for learning purposes - NOT production-ready**
- All data is stored in-memory and will be lost when the server restarts
- File uploads are limited to 16MB
- Uploaded files get unique timestamps to prevent overwrites
- Server runs in debug mode by default (disable for production)
- All user input is validated and sanitized
- CORS is enabled for all routes
- Uses Jinja2 templates for frontend rendering
