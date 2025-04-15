# Annotation Tool Backend Requirements

## 1. Core Functionality

### 1.1 Project Management
- Create, read, update, and delete projects
- Each project must have:
  - Unique identifier
  - Name
  - Type (e.g., "chat_disentanglement")
  - Description (optional)
  - Creation timestamp
  - Status (active, archived, etc.)

### 1.2 User Management
- User authentication and authorization
- User roles (admin, annotator)
- Project assignments (users can be assigned to projects)
- User session management

### 1.3 Data Management
- Import data from CSV files
- Each chat room is imported from a single CSV file containing turns
- CSV file format for chat disentanglement:
  - Required columns (must exist in CSV):
    - turn_id: Unique ID for the turn
    - user_id: ID of the user who sent the turn
    - turn_text: The actual text content of the turn
    - reply_to_turn: ID of the turn being replied to (can be empty)
    - thread: Column containing existing thread annotations (name may vary, e.g., "thread", "thread_id", "thread_name")
  - Chat Room metadata (from CSV filename):
    - room_id: Unique identifier for the chat room
- Import process:
  - When importing a CSV file:
    1. Create or update chat room in the project
    2. Import all turns into the chat room
    3. For turns with existing thread values in the 'thread' column:
       - Create thread annotations within the chat room context
       - Associate with the system user (import user)
       - Set creation timestamp to import time
       - Mark as imported annotation
  - Track import history:
    - Record which user performed the import
    - Store import timestamp
    - Track which turns were imported
    - Record any import errors or warnings

### 1.4 Project Management
- Projects contain multiple chat rooms
- Each chat room can have multiple threads
- Project-level operations:
  - View overall annotation progress
  - Track completion status per chat room
  - Generate project-wide statistics
  - Export project data
  - Manage user assignments
- Chat room-level operations:
  - View thread distribution
  - Track annotation progress
  - Generate room-specific statistics
  - Export room data
  - View annotation history

### 1.5 Annotation Management
- Create, read, update, and delete annotations within chat rooms
- Support for thread annotations:
  - Each turn can have one or more thread annotations
  - Threads are scoped to chat rooms
  - Thread ID must be a string
  - Optional confidence score
  - Optional notes
  - Required metadata:
    - Created by (user ID)
    - Created at (timestamp)
    - Updated at (timestamp)
    - Source (manual, import, etc.)
  - Annotation history:
    - Track all changes to annotations within chat rooms
    - Record who made each change
    - Store timestamps for all changes
    - Maintain change history per turn
- User associations:
  - Users must be assigned to projects
  - Users can only annotate turns in projects they're assigned to
  - Track which users have annotated which turns
  - Maintain user activity history per project and chat room

## 2. Data Models

### 2.1 Database Schema
```sql
-- Projects
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project Assignments
CREATE TABLE project_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    project_id INTEGER REFERENCES projects(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat Rooms
CREATE TABLE chat_rooms (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    room_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',  -- pending, in_progress, completed
    total_turns INTEGER DEFAULT 0,
    annotated_turns INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat Turns
CREATE TABLE chat_turns (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES chat_rooms(id),
    turn_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    turn_text TEXT NOT NULL,
    reply_to_turn VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Threads
CREATE TABLE threads (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES chat_rooms(id),
    thread_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Thread Annotations
CREATE TABLE thread_annotations (
    id SERIAL PRIMARY KEY,
    turn_id INTEGER REFERENCES chat_turns(id),
    thread_id INTEGER REFERENCES threads(id),
    created_by INTEGER REFERENCES users(id),
    confidence FLOAT,
    notes TEXT,
    source VARCHAR(50) NOT NULL DEFAULT 'manual',  -- 'manual', 'import', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Annotation History
CREATE TABLE annotation_history (
    id SERIAL PRIMARY KEY,
    annotation_id INTEGER REFERENCES thread_annotations(id),
    turn_id INTEGER REFERENCES chat_turns(id),
    thread_id INTEGER REFERENCES threads(id),
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(20) NOT NULL,  -- 'create', 'update', 'delete'
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Import History
CREATE TABLE import_history (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    room_id INTEGER REFERENCES chat_rooms(id),
    user_id INTEGER REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    total_turns INTEGER,
    imported_turns INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Pydantic Schemas
```python
# Base schemas for data validation
class ProjectBase(BaseModel):
    name: str
    type: str
    description: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr

class ChatRoomBase(BaseModel):
    room_id: str
    name: Optional[str] = None

class ChatTurnBase(BaseModel):
    turn_id: str
    user_id: str
    turn_text: str
    reply_to_turn: str  # Required, can be empty
    timestamp: Optional[datetime] = None

class ThreadBase(BaseModel):
    thread_id: str
    name: Optional[str] = None

class ThreadAnnotationBase(BaseModel):
    thread_id: int  # Reference to threads table
    confidence: Optional[float] = None
    notes: Optional[str] = None
    source: str = "manual"  # 'manual', 'import', etc.

class AnnotationHistoryBase(BaseModel):
    annotation_id: int
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None

class ImportHistoryBase(BaseModel):
    project_id: int
    filename: str
    status: str
    total_turns: int
    imported_turns: int
```

## 3. API Endpoints

### 3.1 Authentication
- POST /auth/token - Get access token
- POST /auth/register - Register new user
- GET /auth/me - Get current user info

### 3.2 Projects
- POST /projects - Create new project
- GET /projects - List all projects
- GET /projects/{project_id} - Get project details
- PUT /projects/{project_id} - Update project
- DELETE /projects/{project_id} - Delete project
- POST /projects/{project_id}/assign - Assign user to project
- DELETE /projects/{project_id}/assign - Remove user from project

### 3.3 Chat Rooms
- POST /projects/{project_id}/rooms - Create new chat room
- GET /projects/{project_id}/rooms - List all chat rooms
- GET /projects/{project_id}/rooms/{room_id} - Get chat room details
- POST /projects/{project_id}/rooms/import - Import chat room from CSV
- GET /projects/{project_id}/rooms/{room_id}/turns - Get all turns in a room

### 3.4 Chat Turns
- POST /rooms/{room_id}/turns - Add new turn
- GET /rooms/{room_id}/turns - List turns in room
- GET /rooms/{room_id}/turns/{turn_id} - Get turn details
- GET /rooms/{room_id}/turns/search - Search turns in room

### 3.5 Chat Disentanglement
- POST /projects/{project_id}/threads - Create new thread
- GET /projects/{project_id}/threads - List all threads
- GET /projects/{project_id}/threads/{thread_id} - Get thread details
- POST /turns/{turn_id}/thread-annotations - Annotate turn with thread
- GET /turns/{turn_id}/thread-annotations - Get thread annotations for turn
- PUT /thread-annotations/{annotation_id} - Update thread annotation
- DELETE /thread-annotations/{annotation_id} - Delete thread annotation
- GET /rooms/{room_id}/thread-summary - Get summary of threads in room
- GET /projects/{project_id}/thread-export - Export thread annotations

### 3.6 History and Tracking
- GET /projects/{project_id}/import-history - Get import history
- GET /rooms/{room_id}/annotation-history - Get annotation history for room
- GET /turns/{turn_id}/annotation-history - Get annotation history for turn
- GET /users/{user_id}/activity - Get user activity history
- GET /projects/{project_id}/user-activity - Get user activity in project

### 3.7 Project Progress
- GET /projects/{project_id}/progress - Get overall project progress
- GET /projects/{project_id}/rooms/progress - Get progress per chat room
- GET /projects/{project_id}/statistics - Get project statistics
- GET /projects/{project_id}/export - Export project data

### 3.8 Chat Room Management
- GET /rooms/{room_id}/progress - Get chat room progress
- GET /rooms/{room_id}/statistics - Get chat room statistics
- GET /rooms/{room_id}/thread-distribution - Get thread distribution
- GET /rooms/{room_id}/export - Export chat room data

## 4. Data Import/Export

### 4.1 CSV Import
- Support for importing chat data from CSV files
- Field mapping configuration
- Validation of required fields
- Error handling and reporting
- Progress tracking for large imports

### 4.2 Export
- Export annotations to CSV
- Export project data in various formats
- Support for partial exports (filtered by date, user, etc.)

## 5. Security Requirements

### 5.1 Authentication
- JWT-based authentication
- Password hashing
- Token expiration and refresh
- Role-based access control

### 5.2 Authorization
- Project-level access control
- Operation-level permissions
- Admin privileges management

## 6. Performance Requirements

### 6.1 Response Times
- API endpoints should respond within 500ms
- Large data imports should be processed asynchronously
- Pagination for large result sets

### 6.2 Scalability
- Support for multiple concurrent users
- Efficient database queries
- Caching where appropriate

## 7. Error Handling

### 7.1 Error Responses
- Consistent error response format
- HTTP status codes
- Detailed error messages
- Validation error details

### 7.2 Logging
- Request/response logging
- Error logging
- Audit logging for sensitive operations

## 8. Testing Requirements

### 8.1 Test Coverage
- Unit tests for all models and schemas
- API endpoint tests
- Data import/export tests
- Authentication/authorization tests

### 8.2 Testing Tools
- pytest for testing
- pytest-asyncio for async tests
- pytest-cov for coverage reporting

## 9. Documentation Requirements

### 9.1 API Documentation
- OpenAPI/Swagger documentation
- Endpoint descriptions
- Request/response examples
- Authentication requirements

### 9.2 Code Documentation
- Docstrings for all functions and classes
- Type hints
- Module-level documentation

## 10. Deployment Requirements

### 10.1 Environment
- Python 3.8+
- PostgreSQL 12+
- Docker support
- Environment variable configuration

### 10.2 Dependencies
- FastAPI
- SQLAlchemy
- Pydantic
- Alembic
- python-jose (JWT)
- passlib
- python-multipart
- aiofiles
- pytest
- pytest-asyncio
- pytest-cov 