# Project Setup Guide

This guide will walk you through setting up the Supplier-Consumer Platform (SCP) project from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Database Setup](#database-setup)
4. [Backend Setup](#backend-setup)
5. [Web Frontend Setup](#web-frontend-setup)
6. [Mobile App Setup](#mobile-app-setup)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

1. **Python 3.12+**
   - Check version: `python3 --version`
   - Download: https://www.python.org/downloads/

2. **Node.js 18+ and npm**
   - Check version: `node --version` and `npm --version`
   - Download: https://nodejs.org/

3. **Docker and Docker Compose**
   - Check Docker: `docker --version`
   - Check Docker Compose: `docker compose version`
   - Download: https://www.docker.com/get-started

4. **Git** (for cloning the repository)
   - Check version: `git --version`

### Optional (for Mobile Development)

5. **Expo CLI** (for mobile app development)
   - Install: `npm install -g expo-cli`
   - Or use: `npx expo` (no global install needed)

6. **iOS Simulator** (macOS only)
   - Requires Xcode from the App Store

7. **Android Studio** (for Android development)
   - Download: https://developer.android.com/studio

---

## Initial Setup

### 1. Clone the Repository

If you haven't already, clone or navigate to the project directory:

```bash
cd /Users/dimerryy/Desktop/scp-platform-2
```

### 2. Verify Project Structure

Ensure you have the following directory structure:

```
scp-platform-2/
└── scp-platform/
    ├── backend/          # FastAPI backend
    ├── web/              # React web frontend
    ├── mobile/           # React Native mobile app
    ├── docker-compose.yml
    └── README.md
```

---

## Database Setup

The project uses PostgreSQL 15 running in a Docker container.

### Step 1: Start the Database

```bash
cd scp-platform
docker compose up -d db
```

This command will:
- Pull the PostgreSQL 15 Docker image (if not already present)
- Create a container named `scp_db`
- Start PostgreSQL on port **5433** (to avoid conflicts with local PostgreSQL)
- Create the database `scp_db` with user `scp_user`

### Step 2: Verify Database is Running

```bash
# Check container status
docker compose ps

# View logs (optional)
docker compose logs db

# Test connection (optional)
docker compose exec db psql -U scp_user -d scp_db -c "SELECT version();"
```

You should see the container running and PostgreSQL version information.

### Database Credentials

- **Host**: `localhost`
- **Port**: `5433`
- **Database**: `scp_db`
- **User**: `scp_user`
- **Password**: `scp_password`
- **Connection String**: `postgresql://scp_user:scp_password@localhost:5433/scp_db`

> **Note**: The database tables will be automatically created when you start the backend server.

---

## Backend Setup

The backend is a FastAPI application located in `scp-platform/backend/`.

### Step 1: Navigate to Backend Directory

```bash
# From scp-platform directory
cd backend
```

### Step 2: Create Virtual Environment

```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate

# On Windows:
# .venv\Scripts\activate
```

You should see `(.venv)` in your terminal prompt, indicating the virtual environment is active.

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

This will install all required Python packages including:
- FastAPI
- SQLAlchemy
- psycopg2-binary (PostgreSQL driver)
- python-jose (JWT authentication)
- passlib (password hashing)
- And other dependencies

### Step 4: Create Environment File

Create a `.env` file in `backend/`:

```bash
# Create .env file
touch .env
```

Add the following content to `.env`:

```env
# Database Configuration
DATABASE_URL=postgresql://scp_user:scp_password@localhost:5433/scp_db

# JWT Configuration
SECRET_KEY=your-secret-key-change-in-production-use-a-long-random-string
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

> **Important**: Change `SECRET_KEY` to a long, random string in production. You can generate one with:
> ```bash
> python3 -c "import secrets; print(secrets.token_urlsafe(32))"
> ```

### Step 5: Start the Backend Server

```bash
# Make sure virtual environment is activated
# Use --host 0.0.0.0 to allow connections from mobile emulators
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Important Notes:**
- `--reload` enables auto-reload on code changes (development only)
- `--host 0.0.0.0` makes the server accessible from mobile emulators
- Without `--host 0.0.0.0`, the server only listens on `localhost` and won't be reachable from Android emulators

### Step 6: Verify Backend is Running

Open your browser and visit:
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

You should see the FastAPI interactive documentation (Swagger UI).

### Backend URLs

- **Local**: http://localhost:8000
- **Android Emulator**: http://10.0.2.2:8000
- **iOS Simulator**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## Web Frontend Setup

The web frontend is a React application with TypeScript, Vite, and Tailwind CSS.

### Step 1: Navigate to Web Directory

```bash
# From scp-platform directory
cd web
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React 19
- React Router DOM
- Axios (HTTP client)
- i18next (internationalization)
- Tailwind CSS
- TypeScript
- And other dependencies

### Step 3: Start the Development Server

```bash
npm run dev
```

The frontend will start and display the URL (typically http://localhost:5173).

### Step 4: Verify Web Frontend

Open your browser and visit the URL shown in the terminal (usually http://localhost:5173).

You should see the login page or dashboard.

### Web Frontend Configuration

The web frontend is configured to connect to `http://localhost:8000` by default. This is set in `web/src/api/client.ts`.

---

## Mobile App Setup

The mobile app is built with React Native and Expo.

### Step 1: Navigate to Mobile Directory

```bash
# From scp-platform directory
cd mobile
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Expo SDK
- React Native
- React Navigation
- Axios
- AsyncStorage
- i18next
- And other dependencies

### Step 3: Configure API URL

Edit `mobile/src/config.ts` to set the correct API URL:

**For iOS Simulator:**
```typescript
export const API_BASE_URL = 'http://127.0.0.1:8000';
```

**For Android Emulator:**
```typescript
export const API_BASE_URL = 'http://10.0.2.2:8000';
```

**For Physical Device:**
```typescript
// Use your computer's LAN IP address
// Find it with: ipconfig getifaddr en0 (macOS) or ipconfig (Windows)
export const API_BASE_URL = 'http://<YOUR-LAN-IP>:8000';
```

> **Note**: Make sure the backend is running with `--host 0.0.0.0` for mobile devices to connect.

### Step 4: Start the Expo Development Server

```bash
npm start
# or
npx expo start
```

This will:
- Start the Expo development server
- Display a QR code in the terminal
- Open the Expo DevTools in your browser

### Step 5: Run on Device/Emulator

**Option A: iOS Simulator (macOS only)**
```bash
npm run ios
# or press 'i' in the Expo CLI
```

**Option B: Android Emulator**
```bash
npm run android
# or press 'a' in the Expo CLI
```

**Option C: Physical Device**
1. Install the Expo Go app from the App Store (iOS) or Google Play (Android)
2. Scan the QR code displayed in the terminal with:
   - iOS: Camera app
   - Android: Expo Go app

### Mobile App Configuration

The mobile app configuration is in `mobile/src/config.ts`. Make sure to update `API_BASE_URL` based on your development environment.

---

## Verification

### Complete Setup Checklist

- [ ] Database is running (`docker compose ps` shows `scp_db` container)
- [ ] Backend server is running (http://localhost:8000/docs accessible)
- [ ] Web frontend is running (http://localhost:5173 accessible)
- [ ] Mobile app can connect to backend (if testing mobile)

### Test the Setup

1. **Test Backend API:**
   - Visit http://localhost:8000/docs
   - Try the `/health` endpoint
   - Try registering a new user at `/auth/register`

2. **Test Web Frontend:**
   - Visit http://localhost:5173
   - Try logging in or registering
   - Navigate through the application

3. **Test Mobile App:**
   - Open the app in simulator/emulator
   - Try logging in or registering
   - Verify API calls are working

---

## Troubleshooting

### Database Issues

**Problem: Port 5433 already in use**
```bash
# Check what's using the port
lsof -i :5433

# Or change the port in docker-compose.yml
# Edit ports: "5434:5432" and update DATABASE_URL accordingly
```

**Problem: Database container won't start**
```bash
# Check Docker is running
docker ps

# View detailed logs
docker compose logs db

# Remove and recreate container
docker compose down -v
docker compose up -d db
```

**Problem: Can't connect to database**
- Verify DATABASE_URL in `.env` matches docker-compose.yml settings
- Ensure database container is running: `docker compose ps`
- Check port is correct (5433, not 5432)

### Backend Issues

**Problem: Module not found errors**
```bash
# Ensure virtual environment is activated
source .venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

**Problem: Database connection errors**
- Verify database is running: `docker compose ps`
- Check `.env` file exists and has correct DATABASE_URL
- Ensure port in DATABASE_URL matches docker-compose.yml (5433)

**Problem: Tables not created**
- Check backend logs for errors
- Verify database connection is working
- Tables are created automatically on startup - check `app/main.py`

**Problem: Backend not accessible from mobile**
- Ensure you're using `--host 0.0.0.0` flag
- Check firewall settings
- For physical devices, use your LAN IP address

### Web Frontend Issues

**Problem: npm install fails**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Problem: Can't connect to backend**
- Verify backend is running on http://localhost:8000
- Check browser console for CORS errors
- Verify API URL in `src/api/client.ts`

**Problem: Build errors**
```bash
# Check TypeScript errors
npm run build

# Check for linting errors
npm run lint
```

### Mobile App Issues

**Problem: Expo CLI not found**
```bash
# Use npx instead of global install
npx expo start
```

**Problem: Can't connect to backend from emulator**
- **Android**: Use `http://10.0.2.2:8000` in config.ts
- **iOS**: Use `http://127.0.0.1:8000` in config.ts
- Ensure backend is running with `--host 0.0.0.0`

**Problem: Can't connect from physical device**
- Find your computer's IP: `ipconfig getifaddr en0` (macOS) or `ipconfig` (Windows)
- Update `API_BASE_URL` in `config.ts` to use your LAN IP
- Ensure backend is running with `--host 0.0.0.0`
- Ensure device and computer are on the same network
- Check firewall isn't blocking port 8000

**Problem: Metro bundler errors**
```bash
# Clear cache
npx expo start -c

# Or reset completely
rm -rf node_modules
npm install
```

### General Issues

**Problem: Port already in use**
```bash
# Find process using the port
lsof -i :8000  # Backend
lsof -i :5173  # Web frontend

# Kill the process or use a different port
```

**Problem: Permission errors (macOS/Linux)**
```bash
# Use sudo only if necessary, but prefer fixing permissions
chmod +x scripts/*.sh  # If you have scripts
```

---

## Development Workflow

### Daily Development

1. **Start Database** (one time, keep running):
   ```bash
   cd scp-platform
   docker compose up -d db
   ```

2. **Start Backend** (in one terminal):
   ```bash
   cd scp-platform
   cd backend
   source .venv/bin/activate
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Start Web Frontend** (in another terminal):
   ```bash
   cd scp-platform
   cd web
   npm run dev
   ```

4. **Start Mobile App** (in another terminal, if needed):
   ```bash
   cd scp-platform
   cd mobile
   npm start
   ```

### Stopping Services

- **Database**: `docker compose down` (in `scp-platform` directory)
- **Backend**: Press `Ctrl+C` in the terminal
- **Web Frontend**: Press `Ctrl+C` in the terminal
- **Mobile**: Press `Ctrl+C` in the terminal

---

## Next Steps

After setup is complete:

1. **Read the API Documentation**: Visit http://localhost:8000/docs
2. **Explore the Codebase**: Check the project structure in README.md
3. **Run Tests**: See TESTING.md for testing instructions
4. **Review Database Schema**: Check `backend/app/models.py`

---

## Additional Resources

- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **React Documentation**: https://react.dev/
- **Expo Documentation**: https://docs.expo.dev/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/

---

## Support

If you encounter issues not covered in this guide:

1. Check the error messages carefully
2. Review the logs (backend, database, frontend)
3. Verify all prerequisites are installed correctly
4. Ensure all services are running
5. Check the Troubleshooting section above

For project-specific questions, refer to the main README.md file.

