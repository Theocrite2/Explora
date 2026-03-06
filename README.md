# Explora API

A deployed REST API that delivers historical, geopolitical, and cultural context for locations worldwide. Users discover nearby places, save favorites, and receive AI-generated imagery — all processed asynchronously in the background.

**Live:** https://explora-production-b6ef.up.railway.app

---

## Features

- **User authentication** — register, login, JWT-protected routes
- **Role-based authorization** — admin/user access control
- **Location search** — find places within a radius using PostGIS spatial queries
- **Context snippets** — retrieve articles, history, and facts about a location
- **AI image generation** — automatic image generation via Replicate (Flux-1.1-pro), stored on Cloudinary
- **Async task queue** — Celery + Redis; image generation runs in the background without blocking the API
- **Favorites** — users can save, remove, and list favorite locations
- **Admin user management** — list, paginate, promote/demote, and delete users

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Bcrypt |
| Database | PostgreSQL + PostGIS (geospatial queries) |
| Task Queue | Celery + Redis |
| AI Image Generation | Replicate — black-forest-labs/flux-1.1-pro |
| Media Storage | Cloudinary |
| Containerization | Docker + Docker Compose |
| Deployment | Railway |
| Testing | pytest |

---

## Local Development (Docker)

**Prerequisites:** Docker Desktop

```bash
git clone https://github.com/Theocrite2/Explora.git
cd Explora
```

Create a `.env.docker` file:

```env
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

Start all services:

```bash
docker-compose up --build
```

Initialize the database:

```bash
docker-compose exec web flask init-db
```

The API is available at `http://localhost:5000`.

---

## API Endpoints

### Public

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Welcome / health check |
| GET | `/api/context?lat=&lng=&radius=` | Get context snippets near coordinates |

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/register` | Register new user — body: `username`, `email`, `password` |
| POST | `/api/login` | Login, receive JWT — body: `email`, `password` |

### User (JWT required)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/favorites` | List user's saved locations |
| POST | `/api/locations/<id>/favorite` | Add location to favorites |
| DELETE | `/api/locations/<id>/favorite` | Remove location from favorites |
| POST | `/api/user/location` | Submit coordinates — triggers AI image generation for nearby locations |
| GET | `/api/locations/<id>` | Get location details including generated image URL |

### Admin (JWT + `is_admin: true`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/users?page=1&per_page=10` | List users (paginated) |
| GET | `/admin/users/<id>` | Get user details |
| PATCH | `/admin/users/<id>` | Update user — e.g. `{"is_admin": true}` |
| DELETE | `/admin/users/<id>` | Delete user |
| POST | `/api/admin/locations` | Create location — triggers AI image generation automatically |

---

## Architecture

```
POST /api/admin/locations
        │
        ▼
   Flask (web)
        │  enqueues task
        ▼
      Redis
        │  task message
        ▼
  Celery Worker
        │  calls
        ▼
    Replicate
   (Flux-1.1-pro)
        │  image URL
        ▼
   Cloudinary
   (upload + CDN)
        │  final URL
        ▼
   PostgreSQL
  (Supabase + PostGIS)
```

The web process returns immediately after enqueueing. The image URL is populated asynchronously — poll `GET /api/locations/<id>` to check status.

---

## Testing

```bash
pytest tests.py -v
```

---

## License

MIT
