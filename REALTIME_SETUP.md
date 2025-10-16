# Real-time TollChain System Setup Guide

This guide explains how to set up and use the real-time functionality in the TollChain system.

## Overview

The TollChain system now includes comprehensive real-time functionality that allows:
- Real-time vehicle registrations from user side to admin dashboard
- Live toll transaction updates
- Real-time notifications and alerts
- Live dashboard updates for administrators
- Real-time vehicle status changes (blacklist/unblacklist)

## Architecture

### Backend Components
1. **Socket.IO Server** - Handles real-time communication
2. **Database Models** - Store all system data
3. **Real-time Broadcasting** - Sends updates to connected clients

### Frontend Components
1. **User Frontend** - Real-time notifications for users
2. **Admin Dashboard** - Real-time updates for administrators

## Database Models

### Core Models
- **AdminUser** - Admin users with role-based permissions
- **Vehicle** - Vehicle registrations and management
- **TollTransaction** - All toll payment transactions
- **TollPlaza** - Toll plaza locations and rates
- **TollRate** - Dynamic toll rate management
- **SystemConfiguration** - System settings and configuration
- **Notification** - Real-time notifications
- **AuditLog** - Admin action logging
- **Dispute** - Transaction dispute management

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install
npm run seed  # Seed the database with initial data
npm run dev   # Start the backend server
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
```

### 3. Admin Dashboard Setup

```bash
cd admin-dashboard
npm install
npm start
```

## Real-time Features

### User Side Features
- **Vehicle Registration Notifications** - Users get notified when vehicles are registered
- **Transaction Confirmations** - Real-time payment confirmations
- **System Alerts** - Important system notifications
- **Connection Status** - Visual indicator of real-time connection

### Admin Side Features
- **Live Dashboard** - Real-time statistics and metrics
- **Vehicle Management** - Live updates when vehicles are registered/updated
- **Transaction Monitoring** - Real-time transaction processing
- **Notification Center** - Centralized notification management
- **Plaza Management** - Real-time plaza status updates
- **Dispute Handling** - Real-time dispute notifications

## API Endpoints

### Admin Routes
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/vehicles` - Vehicle management
- `GET /api/admin/transactions` - Transaction monitoring
- `GET /api/admin/plazas` - Plaza management
- `GET /api/admin/notifications` - Notification management
- `GET /api/admin/disputes` - Dispute management
- `GET /api/admin/audit-logs` - Audit logging

### User Routes
- `POST /api/vehicles/register` - Vehicle registration
- `POST /api/tolls/pay` - Toll payment
- `GET /api/vehicles/user/:address` - User vehicles
- `GET /api/tolls/stats/:address` - User statistics

## Real-time Events

### Socket.IO Events

#### Admin Events
- `admin:join` - Admin joins their room
- `transaction:new` - New transaction broadcast
- `vehicle:registered` - New vehicle registration
- `vehicle:blacklist` - Vehicle blacklist status change
- `plaza:created` - New plaza created
- `dispute:updated` - Dispute status update
- `system:alert` - System alert
- `notification:new` - New notification

#### User Events
- `user:join` - User joins their room
- `realtime:transaction` - Transaction update
- `realtime:vehicle` - Vehicle update
- `realtime:notification` - Notification update
- `realtime:alert` - Alert update

## Configuration

### Environment Variables

#### Backend (.env)
```
MONGODB_URI=mongodb://localhost:27017/tollchain
PORT=3001
FRONTEND_URL=http://localhost:3000
ADMIN_DASHBOARD_URL=http://localhost:3002
```

#### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_API_URL=http://localhost:3001
```

#### Admin Dashboard (.env)
```
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_API_URL=http://localhost:3001
```

## Testing Real-time Functionality

### 1. Start All Services
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm start

# Terminal 3 - Admin Dashboard
cd admin-dashboard && npm start
```

### 2. Test User Registration
1. Open frontend (http://localhost:3000)
2. Connect wallet
3. Register a vehicle
4. Check admin dashboard for real-time notification

### 3. Test Toll Payment
1. Make a toll payment in frontend
2. Check admin dashboard for real-time transaction update

### 4. Test Admin Actions
1. Open admin dashboard (http://localhost:3002)
2. Login with admin credentials
3. Blacklist/unblacklist a vehicle
4. Check frontend for real-time updates

## Admin Credentials

After running `npm run seed` in the backend:

- **Super Admin**: superadmin@tollchain.com / admin123
- **Admin**: admin@tollchain.com / admin123
- **Operator**: operator@tollchain.com / admin123

## Troubleshooting

### Common Issues

1. **Socket Connection Failed**
   - Check if backend is running on port 3001
   - Verify CORS settings in backend
   - Check network connectivity

2. **Real-time Updates Not Working**
   - Verify Socket.IO connection status
   - Check browser console for errors
   - Ensure proper event listeners are set up

3. **Database Connection Issues**
   - Verify MongoDB is running
   - Check MONGODB_URI in .env
   - Run database seeding script

4. **Admin Dashboard Not Loading**
   - Check if admin user exists in database
   - Verify authentication flow
   - Check browser console for errors

### Debug Mode

Enable debug logging by setting:
```
DEBUG=socket.io:*
```

## Performance Considerations

- Socket.IO connections are limited to prevent overload
- Real-time data is cached and limited to recent entries
- Database queries are optimized with proper indexing
- Connection pooling is used for database connections

## Security Features

- Role-based access control for admin functions
- JWT authentication for API endpoints
- Socket.IO authentication for real-time connections
- Input validation and sanitization
- Audit logging for all admin actions

## Monitoring

- Real-time connection status indicators
- Error logging and monitoring
- Performance metrics tracking
- Database query optimization

## Future Enhancements

- Mobile app real-time support
- Push notifications
- Advanced analytics dashboard
- Multi-language support
- Advanced security features
