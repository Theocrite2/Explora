# Explora API

A REST API that delivers rich historical, geopolitical, and cultural context for locations. Users can discover nearby places, save favorites, and admins can manage content. AI-generated images are automatically created for each location using Replicate (Flux) and stored on Cloudinary.

## Features

- User authentication – register, login, JWT-protected routes
- Authorization – role-based access (admin/user)
- Location search – find places within a radius using PostGIS spatial queries
- Context snippets – retrieve articles, history, facts about a location
- AI image generation – automatic image generation via Replicate Flux-1.1-pro, uploaded to Cloudinary
- Async task queue – Celery + Redis for background image generation
- Favorites – users can save/remove locations and list their favorites
- Admin user management – list, delete, promote/demote users

## Tech Stack

- **Backend:** Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Bcrypt
- **Database:** PostgreSQL + PostGIS (geospatial queries)
- **Task Queue:** Celery + Redis
- **AI Image Generation:** Replicate (black-forest-labs/flux-1.1-pro)
- **Media Storage:** Cloudinary
- **Containerization:** Docker + Docker Compose
- **Testing:** pytest

## Setup (Local Development with Docker)

### Prerequisites
- Docker Desktop

### Run
```bash
git clone https://github.com/Theocrite2/Explora.git
cd Explora
```

Create a `.env.docker` file:
```
DATABASE_URL=postgresql://postgres:postgres@db:5432/explora
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
JWT_SECRET_KEY=your-jwt-secret
SECRET_KEY=your-flask-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
REPLICATE_API_TOKEN=your-replicate-token
```
```bash
docker-compose up --build
```

Initialize the database:
```
http://localhost:5000/init_db
```

## API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | Welcome page |
| GET | /init_db | Create database tables |
| GET | /api/context?lat=<lat>&lng=<lng>&radius=<radius> | Get context snippets near coordinates |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/register | Register new user (JSON: username, email, password) |
| POST | /api/login | Login, receive JWT token (JSON: email, password) |

### User (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/favorites | List user's favorite locations |
| POST | /api/locations/<id>/favorite | Add location to favorites |
| DELETE | /api/locations/<id>/favorite | Remove from favorites |
| POST | /api/user/location | Send coordinates, trigger image generation for nearby locations |

### Admin (JWT + is_admin=True)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/users?page=1&per_page=10 | List users (paginated) |
| GET | /admin/users/<id> | Get user details |
| PATCH | /admin/users/<id> | Update user (e.g., {"is_admin": true}) |
| DELETE | /admin/users/<id> | Delete user |
| POST | /api/admin/locations | Create location — triggers AI image generation automatically |

## Testing
```bash
pytest tests.py -v
```

## License

MIT
