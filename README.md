# Explora API

A REST API that delivers rich historical, geopolitical, and cultural context for locations. Users can discover nearby places, save favorites, and admins can manage content.

## Features

- **User authentication** – register, login, JWT-protected routes
- **Authorization** – role-based access (admin/user)
- **Location search** – find places within a radius of given coordinates
- **Context snippets** – retrieve articles, history, facts about a location
- **Favorites** – users can save/remove locations and list their favorites
- **Admin user management** – list, delete, promote/demote users
- **Tested** – pytest suite covering core endpoints

## Tech Stack

- **Backend**: Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Bcrypt
- **Database**: SQLite (development), ready for PostgreSQL
- **Testing**: pytest
- **Environment**: python-dotenv for configuration

## Setup (Local Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/Theocrite2/Explora.git
   cd Explora
   ```

2. **Create and activate a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate      # on Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment variables**  
   Create a `.env` file in the project root with:
   ```env
   JWT_SECRET_KEY=your-jwt-secret-change-this
   SECRET_KEY=your-flask-secret-change-this
   ```

5. **Initialize the database**  
   Run the Flask app and visit `/init_db` once, or from the terminal:
   ```bash
   flask shell
   >>> from app import db
   >>> db.create_all()
   >>> exit()
   ```

6. **Start the server**
   ```bash
   python app.py
   ```

The API will be available at `http://localhost:5000`.

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Welcome page |
| GET | `/init_db` | Create tables (development only) |
| GET | `/api/test` | Health check |
| GET | `/api/context?lat=<lat>&lng=<lng>&radius=<radius>` | Get context snippets near coordinates |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register new user (JSON: `username`, `email`, `password`) |
| POST | `/api/login` | Login, receive JWT token |

### User (JWT required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/favorites` | List user's favorite locations |
| POST | `/api/locations/<id>/favorite` | Add location to favorites |
| DELETE | `/api/locations/<id>/favorite` | Remove from favorites |

### Admin (JWT + `is_admin=True`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users?page=1&per_page=10` | List users (paginated) |
| GET | `/admin/users/<id>` | Get user details |
| PATCH | `/admin/users/<id>` | Update user (e.g., `{"is_admin": true}`) |
| DELETE | `/admin/users/<id>` | Delete user |
| POST | `/api/admin/locations` | Create location (JSON: `name`, `latitude`, `longitude`) |

## Testing

Run the test suite with:

```bash
pytest test_api.py -v
```

## Deployment

This API is ready to be deployed on platforms like Render, Heroku, or PythonAnywhere. For production, switch to a PostgreSQL database and set environment variables accordingly.

## License

MIT
