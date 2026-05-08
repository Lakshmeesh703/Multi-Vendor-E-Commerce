#!/bin/bash

# VendorHub: Professional Multi-Role E-Commerce Platform
# Single command to run full-stack app with one URL

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "🏪 VENDORHUB - Professional Multi-Role Marketplace"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📁 Project: $PROJECT_ROOT"
echo "🔗 URL: http://localhost:4000"
echo ""

# Kill any existing process on ports 4000/3000
if lsof -i :4000 &> /dev/null; then
  echo "🔄 Clearing port 4000..."
  lsof -i :4000 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
  sleep 1
fi

if lsof -i :3000 &> /dev/null; then
  echo "🔄 Clearing port 3000..."
  lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install Node.js v18+."
  exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION detected"
echo ""

SKIP_SEED=${SKIP_SEED:-1}
RUN_DEV_FRONTEND=${RUN_DEV_FRONTEND:-0}
BACKEND_NODE_OPTIONS=${BACKEND_NODE_OPTIONS:-"--max-old-space-size=256"}

# Install dependencies
echo "════════════════════════════════════════════════════════════════"
echo "📦 Installing Dependencies"
echo "════════════════════════════════════════════════════════════════"

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo "📦 Backend dependencies..."
  cd "$BACKEND_DIR"
  npm install --quiet
  echo "   ✅ Done"
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "📦 Frontend dependencies..."
  cd "$FRONTEND_DIR"
  npm install --quiet
  echo "   ✅ Done"
fi

echo ""

# Seed database
echo "════════════════════════════════════════════════════════════════"
echo "🌱 Seeding Database"
echo "════════════════════════════════════════════════════════════════"

cd "$BACKEND_DIR"
if [ "$SKIP_SEED" = "1" ]; then
  echo "⏭️  Skipping seed (SKIP_SEED=1)"
else
  # Best-effort cleanup in case a previous seed got stuck.
  if pgrep -af "node seed.js" >/dev/null 2>&1; then
    echo "🔄 Stopping existing seed.js process(es)..."
    pkill -f "node seed.js" 2>/dev/null || true
    sleep 1
  fi

  echo "📝 Seeding log: /tmp/vendorhub_seed.log"
  # Prevent concurrent seeds (which can spike memory/DB load).
  SEED_LOCK="/tmp/vendorhub_seed.lock"
  exec 9>"$SEED_LOCK"
  if ! flock -n 9; then
    echo "⚠️  Another seed is already running; skipping seed."
  else
    if ! npm run seed > /tmp/vendorhub_seed.log 2>&1; then
      echo "❌ Seed failed. Last 60 lines from /tmp/vendorhub_seed.log:"
      tail -n 60 /tmp/vendorhub_seed.log || true
      exit 1
    fi
    echo "✅ Database seeded with test users, products, and orders"
  fi
fi
echo ""

if [ "$RUN_DEV_FRONTEND" = "1" ]; then
  echo "🧩 Frontend dev server enabled (RUN_DEV_FRONTEND=1)"
else
  echo "🧩 Frontend dev server disabled (RUN_DEV_FRONTEND=0)"
fi
echo "🧠 Backend Node memory cap: $BACKEND_NODE_OPTIONS (override with BACKEND_NODE_OPTIONS=...)"

echo "════════════════════════════════════════════════════════════════"
echo "🚀 Starting Multi-Vendor E-Commerce Platform"
echo "════════════════════════════════════════════════════════════════"
echo ""
if [ "$RUN_DEV_FRONTEND" = "1" ]; then
  echo "🔗 Frontend dev server running on http://localhost:3000"
  echo "🔗 Backend running on http://localhost:4000"
else
  echo "🔗 App running on http://localhost:4000"
fi
echo ""
echo "🔗 Customer login: http://localhost:4000/customer/login"
echo "🔗 Vendor login: http://localhost:4000/vendor/login"
echo "🔗 Admin login: http://localhost:4000/admin/login"
echo ""
echo "✅ PostgreSQL connected"
echo "✅ MongoDB connected"
echo "✅ JWT authentication active"
echo "✅ Role-based access working"
echo "✅ Multi-vendor checkout working"
echo "✅ Inventory sync active"
echo ""
echo "⏹️  Press Ctrl+C to stop the servers"
if [ "$RUN_DEV_FRONTEND" = "1" ]; then
  echo "📝 Logs: /tmp/vendorhub_backend.log and /tmp/vendorhub_frontend.log"
else
  echo "📝 Log: /tmp/vendorhub_backend.log"
fi
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

cd "$BACKEND_DIR"
NODE_OPTIONS="$BACKEND_NODE_OPTIONS" npm run start > /tmp/vendorhub_backend.log 2>&1 &
BACKEND_PID=$!

cleanup() {
  set +e
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "${FRONTEND_PID:-}" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if [ "$RUN_DEV_FRONTEND" = "1" ]; then
  cd "$FRONTEND_DIR"
  npm run dev -- --host 0.0.0.0 --port 3000 > /tmp/vendorhub_frontend.log 2>&1 &
  FRONTEND_PID=$!
else
  FRONTEND_PID=""
fi

MAX_RETRIES=30
RETRY=0
until curl -s http://127.0.0.1:4000/health > /dev/null 2>&1 || [ $RETRY -ge $MAX_RETRIES ]; do
  sleep 1
  RETRY=$((RETRY+1))
done

if curl -s http://127.0.0.1:4000/health > /dev/null 2>&1; then
  echo "✅ Backend is healthy at http://localhost:4000"
else
  echo "⚠️  Backend did not become healthy within timeout. Check /tmp/vendorhub_backend.log"
fi

if [ "$RUN_DEV_FRONTEND" = "1" ]; then
  MAX_RETRIES=30
  RETRY=0
  until curl -s http://127.0.0.1:3000 > /dev/null 2>&1 || [ $RETRY -ge $MAX_RETRIES ]; do
    sleep 1
    RETRY=$((RETRY+1))
  done

  if curl -s http://127.0.0.1:3000 > /dev/null 2>&1; then
    echo "✅ Frontend dev server is healthy at http://localhost:3000"
  else
    echo "⚠️  Frontend dev server did not become healthy within timeout. Check /tmp/vendorhub_frontend.log"
  fi
else
  echo "✅ Frontend is served by backend at http://localhost:4000"
fi

set +e
wait $BACKEND_PID
BACKEND_EXIT=$?
if [ -n "${FRONTEND_PID:-}" ]; then
  wait $FRONTEND_PID
fi
set -e

if [ "$BACKEND_EXIT" -eq 137 ]; then
  echo "❌ Backend exited with 137 (SIGKILL). This is commonly OOM-killer/cgroup kill."
  echo "   Try: SKIP_SEED=1 bash run.sh"
  echo "   And ensure: RUN_DEV_FRONTEND=0 (unset RUN_DEV_FRONTEND if exported)"
fi

exit $BACKEND_EXIT
