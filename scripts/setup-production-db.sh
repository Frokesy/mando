#!/usr/bin/env bash
# MANDO Production Database Setup Script
# Run this after creating a new Neon project for production
#
# Prerequisites:
#   1. Create a new project on https://console.neon.tech
#   2. Copy the connection string
#   3. Run: export DATABASE_URL="postgresql://..."
#   4. Run: export SUPERADMIN_PASSWORD="your-strong-password-here"

set -e

echo "=== MANDO Production Database Setup ==="
echo ""

# Validate required env vars
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "Usage: export DATABASE_URL=\"postgresql://...\" && bash $0"
  exit 1
fi

if [ -z "$SUPERADMIN_PASSWORD" ]; then
  echo "ERROR: SUPERADMIN_PASSWORD is not set."
  echo "Set a strong password for the admin account."
  exit 1
fi

echo "Step 1: Running database migrations..."
cd apps/api
npm run db:migrate
echo "  ✓ Tables created successfully"
echo ""

echo "Step 2: Seeding superadmin..."
echo "  Email: restaurant.fashina@mando.test"
echo "  Password: [configured via SUPERADMIN_PASSWORD]"
npm run db:seed:superadmin
echo "  ✓ Superadmin seeded successfully"
echo ""

echo "=== Production database setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Set these environment variables in your Vercel project:"
echo "     - DATABASE_URL = (the new production URL)"
echo "     - NODE_ENV = production"
echo "     - SUPERADMIN_EMAIL = restaurant.fashina@mando.test"
echo "     - WEB_ORIGIN = https://yourdomain.com"
echo "  2. Deploy the API to Vercel"
echo ""