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

- **Backend:** Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Bcrypt
- **Database:** SQLite (development), ready for PostgreSQL
- **Testing:** pytest
- **Environment:** python-dotenv for configuration

## Setup (Local Development)

**Clone the repository**
```bash
git clone https://github.com/Theocrite2/Explora.git
cd Explora
```

**Create and activate a virtual environment**
```bash
python -m venv venv
source venv/bin/activate      # on Windows: venv\Scripts\activate
```

**Install dependencies**
```bash
pip install -r requirements.txt
```

**Environment variables**

Create a `.env` file in the project root with:
```
JWT_SECRET_KEY=your-jwt-secret-change-this
SECRET_KEY=your-flask-secret-change-this
```

**Initialize the database**
```bash
flask shell
>>> from app import db
>>> db.create_all()
>>> exit()
```

**Start the server**
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
| POST | `/api/register` | Register new user (JSON: username, email, password) |
| POST | `/api/login` | Login, receive JWT token |

### User (JWT required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/favorites` | List user's favorite locations |
| POST | `/api/locations/<id>/favorite` | Add location to favorites |
| DELETE | `/api/locations/<id>/favorite` | Remove from favorites |

### Admin (JWT + is_admin=True)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users?page=1&per_page=10` | List users (paginated) |
| GET | `/admin/users/<id>` | Get user details |
| PATCH | `/admin/users/<id>` | Update user (e.g., `{"is_admin": true}`) |
| DELETE | `/admin/users/<id>` | Delete user |
| POST | `/api/admin/locations` | Create location (JSON: name, latitude, longitude) |

## Testing
```bash
pytest test_api.py -v
```

## Postman Collection

A Postman collection is included to help you test all endpoints quickly.

**Import the Collection**

1. Download `Explora.postman_collection.json` from the repository.
2. Open Postman, click **Import → File** → choose the downloaded file.

**Set Up Environment Variables**

1. In Postman, create a new environment (e.g., `Local`).
2. Add the following variables:
   - `base_url`: `http://localhost:5000`
   - `token`: *(leave empty initially)*
3. Select this environment from the top-right dropdown.

**Authenticate and Obtain a Token**

1. Send the `POST /api/register` request with a valid JSON body to create a user.
2. Send the `POST /api/login` request with the same credentials.
3. In the **Tests** tab of the login request, add the following script to automatically save the token:
```javascript
const jsonData = pm.response.json();
pm.environment.set("token", jsonData.access_token);
```

After a successful login, the `token` variable will be populated automatically.

**Using the Token in Protected Requests**

All protected endpoints use `{{token}}` in the Authorization header (Bearer Token). This is pre-configured in the collection.

**Promoting a User to Admin**

To test admin endpoints, promote a user via the Flask shell:
```bash
flask shell
>>> from app import User
>>> user = User.query.filter_by(username='your_username').first()
>>> user.is_admin = True
>>> db.session.commit()
>>> exit()
```

Then log in again to get a refreshed token with admin privileges.

## Deployment

Ready to deploy on Render, Heroku, or PythonAnywhere. For production, switch to PostgreSQL and set environment variables accordingly.

## License

MIT|--------|----------|-------------|
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
