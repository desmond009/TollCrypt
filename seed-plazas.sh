#!/bin/bash

# Plaza Database Seeding Script
# This script seeds the database with the 5 production-ready dummy plazas

echo "🚀 Starting Plaza Database Seeding..."

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the backend directory"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB doesn't appear to be running. Please start MongoDB first."
    echo "   You can start it with: brew services start mongodb-community"
    echo "   Or: sudo systemctl start mongod"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Set environment variables
export NODE_ENV=development
export MONGODB_URI=${MONGODB_URI:-"mongodb://localhost:27017/tollchain"}

echo "🔧 Environment Configuration:"
echo "   NODE_ENV: $NODE_ENV"
echo "   MONGODB_URI: $MONGODB_URI"

# Run the plaza seeding script
echo "🌱 Seeding plaza database..."
npx ts-node src/scripts/seedPlazaDatabase.ts

if [ $? -eq 0 ]; then
    echo "✅ Plaza database seeding completed successfully!"
    echo ""
    echo "📊 Summary:"
    echo "   - 5 production-ready plazas created"
    echo "   - Toll rates configured for all vehicle categories"
    echo "   - Compliance and operational data populated"
    echo "   - Smart contract addresses assigned"
    echo ""
    echo "🔑 Admin Credentials:"
    echo "   Email: superadmin@tollchain.com"
    echo "   Password: admin123"
    echo ""
    echo "🌐 API Endpoints Available:"
    echo "   GET    /api/plazas                    - List all plazas"
    echo "   GET    /api/plazas/:uniqueId           - Get specific plaza"
    echo "   GET    /api/plazas/proximity           - Find nearby plazas"
    echo "   POST   /api/plazas/:uniqueId/calculate-toll - Calculate toll"
    echo ""
    echo "🎯 Test the API:"
    echo "   curl http://localhost:3001/api/plazas"
else
    echo "❌ Plaza database seeding failed!"
    echo "   Check the error messages above for details."
    exit 1
fi
