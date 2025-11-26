# Supplier-Consumer Platform (SCP)

A B2B platform for suppliers (food producers/distributors) and institutional consumers (restaurants/hotels).

## Prerequisites

- **Docker Desktop** - Download: https://www.docker.com/get-started

## Quick Start

### Start All Services (Database, Backend, Web)

```bash
docker compose up --build
```

**Access:**
- **Web**: http://localhost:5173
- **Backend API**: http://localhost:8000/docs
- **Mobile DevTools**: http://localhost:19001

### Stop Services

```bash
docker compose down
```

### Start Specific Services

```bash
# Database + Backend + Web
docker compose up db backend web

# Only Database
docker compose up db
```

### View Logs

```bash
docker compose logs -f
```

## Mobile App (For Simulators)

For iOS/Android simulators, run mobile locally:

```bash
cd mobile
npm install
npm start
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go on physical device

**Update API URL** in `mobile/src/config.ts`:
- iOS Simulator: `http://127.0.0.1:8000`
- Android Emulator: `http://10.0.2.2:8000`
- Physical Device: `http://<YOUR-LAN-IP>:8000`

## Troubleshooting

```bash
# Rebuild everything
docker compose up --build

# Remove everything and start fresh
docker compose down -v
docker compose up --build

# Check container status
docker compose ps
```
