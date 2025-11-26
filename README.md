# Construction Management System - Backend

Backend API server for the Construction Management System built with Node.js, Express, and MongoDB.

## 🚀 Live Deployment

- **Production URL**: https://construction-management-system-soft.vercel.app/

## 📋 Features

- **Authentication System**
  - JWT-based authentication
  - Secure password hashing with bcryptjs
  - Protected routes with middleware
- **User Management**
  - Role-based access control (Admin, Manager, Accountant, User)
  - User CRUD operations
  - Status management (Active/Inactive)
- **Security**
  - CORS configuration
  - JWT token validation
  - Environment variable protection

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js v5.1.0
- **Database**: MongoDB with Mongoose v9.0.0
- **Authentication**: JWT (jsonwebtoken v9.0.2)
- **Password Hashing**: bcryptjs v3.0.3
- **Environment Variables**: dotenv v17.2.3
- **CORS**: cors v2.8.5

## 📁 Project Structure

```
server/
├── controllers/
│   ├── authController.js    # Authentication logic
│   └── userController.js    # User management logic
├── db/
│   └── db.js               # MongoDB connection
├── middleware/
│   └── authMiddleware.js   # JWT verification & authorization
├── models/
│   └── User.js             # User schema
├── routes/
│   ├── authRoutes.js       # Auth endpoints
│   └── userRoutes.js       # User endpoints
├── .gitignore
├── index.js                # Server entry point
└── package.json
```

## 🔧 Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd server
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

4. Start the development server:

```bash
npm run dev
```

## 📡 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint          | Description      | Access  |
| ------ | ----------------- | ---------------- | ------- |
| POST   | `/api/auth/login` | User login       | Public  |
| GET    | `/api/auth/me`    | Get current user | Private |

### User Routes (`/api/users`)

| Method | Endpoint                       | Description        | Access |
| ------ | ------------------------------ | ------------------ | ------ |
| GET    | `/api/users`                   | Get all users      | Admin  |
| GET    | `/api/users/:id`               | Get user by ID     | Admin  |
| POST   | `/api/users`                   | Create new user    | Admin  |
| PUT    | `/api/users/:id`               | Update user        | Admin  |
| DELETE | `/api/users/:id`               | Delete user        | Admin  |
| PATCH  | `/api/users/:id/toggle-status` | Toggle user status | Admin  |

### Test Routes

| Method | Endpoint    | Description   | Access |
| ------ | ----------- | ------------- | ------ |
| GET    | `/`         | API status    | Public |
| GET    | `/api/test` | Test endpoint | Public |

## 🔐 User Roles

- **admin**: Full system access
- **manager**: Management level access
- **accountant**: Financial operations access
- **user**: Basic user access

## 🌐 CORS Configuration

The API accepts requests from:

- `http://localhost:5173` (Local development)
- `https://construction-management-system-soft.vercel.app` (Production)

## 📦 Scripts

- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (not configured yet)

## 🚀 Deployment

This project is deployed on Vercel. The deployment automatically triggers on push to the main branch.

### Environment Variables on Vercel

Make sure to set these environment variables in your Vercel project settings:

- `MONGODB_URI`
- `JWT_SECRET`
- `NODE_ENV=production`

## 🔒 Authentication Flow

1. User logs in with email and password
2. Server validates credentials
3. JWT token is generated and returned
4. Client stores token in localStorage
5. Token is sent in Authorization header for protected routes
6. Middleware verifies token on each protected request

## 📝 Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

ISC

## 👥 Author

- GitHub: [@malikcancode](https://github.com/malikcancode)

## 🐛 Known Issues

- Test scripts need to be configured
- Additional documentation for specific endpoints needed

## 📞 Support

For support, please open an issue in the GitHub repository.

