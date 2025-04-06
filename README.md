# SafarWay Backend

A complete backend for the SafarWay travel booking platform built with Node.js, Express, and PostgreSQL.

## Features

- User Authentication (Agency & Customer)
- Tour Package Management
- Booking System
- File Upload for Images
- Role-based Access Control
- Input Validation
- Error Handling

## Tech Stack

- Node.js & Express.js
- PostgreSQL Database
- Prisma ORM
- JWT Authentication
- Multer for File Uploads
- Zod for Validation

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd safarway-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/safarway_db?schema=public"
   JWT_SECRET="your-super-secret-jwt-key"
   JWT_EXPIRES_IN="7d"
   PORT=3000
   NODE_ENV="development"
   UPLOAD_DIR="uploads"
   MAX_FILE_SIZE=5242880
   ```

4. Initialize the database:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- POST `/api/auth/register-agency` - Register a new agency
- POST `/api/auth/register-customer` - Register a new customer
- POST `/api/auth/login` - Login for both agencies and customers

### Tour Packages
- GET `/api/packages` - Get all tour packages
- GET `/api/packages/:id` - Get a specific tour package
- POST `/api/packages` - Create a new tour package (Agency only)
- PUT `/api/packages/:id` - Update a tour package (Agency only)
- DELETE `/api/packages/:id` - Delete a tour package (Agency only)

### Bookings
- POST `/api/bookings` - Create a new booking (Customer only)
- GET `/api/bookings/customer` - Get customer's bookings
- GET `/api/bookings/:id` - Get a specific booking
- PATCH `/api/bookings/:id/status` - Update booking status (Agency only)

### File Upload
- POST `/api/upload` - Upload images (Agency only)

## Development

- Run development server: `npm run dev`
- Generate Prisma client: `npm run prisma:generate`
- Run database migrations: `npm run prisma:migrate`
- Open Prisma Studio: `npm run prisma:studio`

## Production

1. Build the application:
   ```bash
   npm install --production
   ```

2. Start the server:
   ```bash
   npm start
   ```

## Security

- All passwords are hashed using bcrypt
- JWT tokens are used for authentication
- Role-based access control is implemented
- Input validation using Zod
- File upload restrictions and validation

## Error Handling

The API uses a centralized error handling system with appropriate HTTP status codes and error messages.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the ISC License. 