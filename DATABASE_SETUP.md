# Database Setup Guide

## Starting with a Fresh Empty Database

To start with a completely empty database (removing all existing data):

### Step 1: Stop and Remove Existing Database

```bash
cd backend
docker compose down -v
```

The `-v` flag removes the volumes, which deletes all database data.

### Step 2: Start Fresh Database

```bash
docker compose up -d db
```

This will:
- Pull the PostgreSQL 15 image (if not already present)
- Create a new empty database `scp_db`
- Create user `scp_user` with password `scp_password`
- Start the database on port **5433**

### Step 3: Verify Database is Running

```bash
# Check container status
docker compose ps

# View logs
docker compose logs db

# Test connection (optional)
docker compose exec db psql -U scp_user -d scp_db -c "SELECT version();"
```

### Step 4: Start Backend (Tables Created Automatically)

When you start the FastAPI backend, it will automatically create all tables:

```bash
cd backend/backend

# Activate virtual environment
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The `create_tables()` function in `app/main.py` will run on startup and create all tables defined in your SQLAlchemy models.

## Database Connection Details

- **Host**: `localhost`
- **Port**: `5433` (mapped from container port 5432)
- **Database**: `scp_db`
- **User**: `scp_user`
- **Password**: `scp_password`
- **Connection String**: `postgresql://scp_user:scp_password@localhost:5433/scp_db`

## Environment Variables

The backend uses the `DATABASE_URL` environment variable. You can set it in:

1. **Environment variable** (recommended for production)
2. **`.env` file** in `backend/backend/.env`:
   ```env
   DATABASE_URL=postgresql://scp_user:scp_password@localhost:5433/scp_db
   ```

If not set, it defaults to the connection string above.

## Useful Commands

### View Database Logs
```bash
docker compose logs -f db
```

### Access PostgreSQL CLI
```bash
docker compose exec db psql -U scp_user -d scp_db
```

### Backup Database
```bash
docker compose exec db pg_dump -U scp_user scp_db > backup.sql
```

### Restore Database
```bash
docker compose exec -T db psql -U scp_user scp_db < backup.sql
```

### Stop Database (Keep Data)
```bash
docker compose stop db
```

### Stop Database (Remove Data)
```bash
docker compose down -v
```

## Troubleshooting

### Port Already in Use
If port 5433 is already in use, you can change it in `docker-compose.yml`:
```yaml
ports:
  - "5434:5432"  # Change 5433 to another port
```

Then update `DATABASE_URL` accordingly.

### Database Connection Errors
1. Ensure Docker is running
2. Check if container is running: `docker compose ps`
3. Check logs: `docker compose logs db`
4. Verify connection string matches docker-compose.yml settings

### Tables Not Created
- Ensure the backend server started successfully
- Check backend logs for errors
- Verify database connection string is correct
- Manually create tables if needed (see below)

### Manual Table Creation (if needed)
If tables weren't created automatically, you can create them manually:

```bash
cd backend/backend
python3 -c "from app.database import engine, Base; from app import models; Base.metadata.create_all(bind=engine)"
```

