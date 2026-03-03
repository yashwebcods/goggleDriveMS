# 📁 Google Drive Management System (GDMS)

A full-stack web application for managing Google Drive assets with a secure authentication system. GDMS provides role-based access control, OTP email verification, and JWT-based session management.

---

## 🏗️ Project Structure

```
Google Drive Management System/
├── Back-end/               # Node.js + Express REST API
│   └── src/
│       ├── config/         # Database configuration (Mongoose)
│       ├── Controllers/    # Route handler logic
│       ├── middleware/     # Auth middleware (JWT protect)
│       ├── Models/         # Mongoose data models
│       ├── Routes/         # Express route definitions
│       └── server.js       # App entry point
└── Front-end/
    └── GDMS/               # React + TypeScript + Vite app
        └── src/
            ├── App.tsx
            ├── main.tsx
            └── assets/
```

---

## ⚙️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | REST API server |
| MongoDB + Mongoose | Database & ODM |
| JSON Web Token (JWT) | Stateless authentication |
| bcryptjs | Password hashing |
| Nodemailer | OTP email delivery |
| express-session | Server-side session management |
| dotenv | Environment variable management |
| nodemon | Development auto-reload |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| TypeScript | Type-safe JavaScript |
| Vite | Build tool & dev server |
| ESLint | Code linting |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (or local MongoDB instance)
- A Gmail account (or SMTP provider) for email OTP delivery

---

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Google Drive Management System"
```

---

### 2. Backend Setup

```bash
cd Back-end
npm install
```

Create a `.env` file in the `Back-end/` directory:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
```

Start the development server:

```bash
npm start
```

The API will be available at `http://localhost:3000`.

---

### 3. Frontend Setup

```bash
cd Front-end/GDMS
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🔌 API Reference

**Base URL:** `http://localhost:3000/api/auth`

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register` | Register a new user |
| `POST` | `/login` | Login and receive JWT token |
| `POST` | `/send-otp` | Send OTP to user's email |
| `POST` | `/verify-otp` | Verify the OTP code |
| `POST` | `/forget-password` | Initiate password reset |
| `POST` | `/resend-otp` | Resend OTP to user's email |

### Protected Endpoints

> Requires `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/profile` | Get the authenticated user's profile |

---

## 👤 User Model

```
username      String   (unique, required)
email         String   (unique, required, lowercase)
password      String   (hashed with bcrypt, min 6 chars)
role          String   (enum: user | admin | superadmin | client)
isActive      Boolean  (default: true)
otp           String   (current OTP code)
otpExpiresAt  Date     (OTP expiry timestamp)
isValidOtp    Boolean  (OTP validation status)
```

---

## 🔐 Authentication Flow

1. **Register** — Create an account with username, email, and password.
2. **OTP Verification** — An OTP is sent to the registered email via Nodemailer. Submit the OTP to verify your account.
3. **Login** — Authenticate with email and password to receive a JWT token.
4. **Access Protected Routes** — Pass the JWT in the `Authorization` header to access protected endpoints.
5. **Forgot Password** — Trigger an OTP-based password reset flow via email.

---

## 📜 Available Scripts

### Backend (`Back-end/`)

| Script | Command | Description |
|--------|---------|-------------|
| Start (dev) | `npm start` | Start with nodemon (auto-reload) |

### Frontend (`Front-end/GDMS/`)

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Start Vite dev server |
| Build | `npm run build` | Compile TypeScript & bundle for production |
| Preview | `npm run preview` | Preview the production build locally |
| Lint | `npm run lint` | Run ESLint checks |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.
