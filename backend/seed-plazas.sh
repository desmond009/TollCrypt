#!/bin/bash

# Plaza MongoDB Seeding Script
# This script seeds the MongoDB collections with plaza data for the admin dashboard

echo "🏗️  TollChain Plaza MongoDB Seeding Script"
echo "=========================================="

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Check if MongoDB is running
echo "🔍 Checking MongoDB connection..."
if ! nc -z localhost 27017 2>/dev/null; then
    echo "❌ Error: MongoDB is not running on localhost:27017"
    echo "   Please start MongoDB first:"
    echo "   - macOS: brew services start mongodb-community"
    echo "   - Linux: sudo systemctl start mongod"
    echo "   - Windows: net start MongoDB"
    exit 1
fi

echo "✅ MongoDB is running"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to install dependencies"
        exit 1
    fi
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error: TypeScript build failed"
    exit 1
fi

# Seed the plaza collections
echo "🌱 Seeding plaza collections..."
npm run seed:all-plazas
if [ $? -ne 0 ]; then
    echo "❌ Error: Plaza seeding failed"
    exit 1
fi

echo ""
echo "✅ Plaza seeding completed successfully!"
echo ""
echo "📊 What was created:"
echo "   - SimplePlaza collection (for admin dashboard)"
echo "   - TollPlaza collection (for comprehensive system)"
echo "   - 5 sample plazas with realistic data"
echo ""
echo "🚀 Next steps:"
echo "   1. Start the backend server: npm run dev"
echo "   2. Open the admin dashboard"
echo "   3. Navigate to Plaza Management"
echo "   4. You should see plazas loaded from MongoDB"
echo ""
echo "🔧 Available commands:"
echo "   - npm run seed:simple-plazas  (admin dashboard only)"
echo "   - npm run seed:plazas         (comprehensive system only)"
echo "   - npm run seed:all-plazas     (both collections)"
echo ""
echo "📚 For more information, see: PLAZA_MONGODB_INTEGRATION.md"
