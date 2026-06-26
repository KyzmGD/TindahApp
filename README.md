# Tindah

A mobile dating application inspired by Tinder, built with **React Native (Expo)**, **Node.js**, **Express.js**, **MongoDB**, and **Socket.IO**.

The project allows users to create profiles, discover other users, swipe left or right, match with compatible users, and communicate through real-time messaging.

---

## Features

### Authentication

* User registration
* User login
* JWT-based authentication
* Protected API endpoints

### User Profile

* Create and update profile
* Manage personal information
* Set preferences and interests

### Matching System

* Swipe left to reject
* Swipe right to like
* Automatic match detection
* Match history

### Real-Time Chat

* Instant messaging
* Socket.IO integration
* Conversation management

### Mobile Experience

* Responsive mobile UI
* React Native + Expo
* Cross-platform support

---

## Technology Stack

### Frontend

| Technology       | Purpose                 |
| ---------------- | ----------------------- |
| React Native     | Mobile application      |
| Expo             | Development platform    |
| Axios            | API communication       |
| React Navigation | Navigation management   |
| Socket.IO Client | Real-time communication |

### Backend

| Technology | Purpose                 |
| ---------- | ----------------------- |
| Node.js    | Runtime environment     |
| Express.js | REST API server         |
| MongoDB    | Database                |
| Mongoose   | ODM                     |
| JWT        | Authentication          |
| Socket.IO  | Real-time communication |

---

## System Architecture

```text
Mobile App (React Native)
           │
           ▼
      REST API
    (Express.js)
           │
           ▼
       MongoDB

Real-time Chat
React Native
      │
      ▼
 Socket.IO
      │
      ▼
 Socket Server
```

---

## Project Structure

```text
tddemo/
│
├── frontend/
│   ├── src/
│   ├── assets/
│   ├── screens/
│   ├── components/
│   └── services/
│
├── backend/
│   ├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── services/
│
├── docs/
├── README.md
└── CHANGELOG.md
```

---

## Installation

### Prerequisites

* Node.js 20+
* MongoDB 7+
* Git
* Expo CLI

---

## Clone Repository

```bash
git clone https://github.com/KyzmGD/tddemo.git

cd tddemo
```

---

## Backend Setup

Navigate to backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create environment file:

```bash
cp .env.example .env
```

Example configuration:

```env
PORT=5000

MONGO_URI=mongodb://localhost:27017/tinderapp

JWT_SECRET=your_secret_key

CLIENT_URL=http://localhost:8081
```

Start development server:

```bash
npm run dev
```

Backend should be running on:

```text
http://localhost:5000
```

---

## Frontend Setup

Navigate to frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npm start
```

or

```bash
npx expo start
```

---

## API Overview

### Authentication

#### Register

```http
POST /api/auth/register
```

#### Login

```http
POST /api/auth/login
```

---

### User

#### Get Profile

```http
GET /api/users/profile
```

#### Update Profile

```http
PUT /api/users/profile
```

---

### Matching

#### Swipe

```http
POST /api/swipes
```

#### Get Matches

```http
GET /api/matches
```

---

### Chat

#### Get Conversations

```http
GET /api/chats
```

#### Send Message

```http
POST /api/chats/message
```

---

## Environment Variables

### Backend

```env
PORT=
MONGO_URI=
JWT_SECRET=
CLIENT_URL=
```

### Frontend

```env
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_SOCKET_URL=
```

---

## Screenshots

### Login Screen

<img width="1919" height="964" alt="image" src="https://github.com/user-attachments/assets/d792b7df-7c97-4883-bdf5-d3c755e2486b" />


### Matching Screen

<img width="1919" height="964" alt="image" src="https://github.com/user-attachments/assets/cba8dc79-9568-4797-ba46-014da740de14" />


### Chat Screen

<img width="1919" height="962" alt="image" src="https://github.com/user-attachments/assets/a65a1c67-b20a-4448-863f-fc50ea264469" />


### Profile Screen

<img width="1919" height="963" alt="image" src="https://github.com/user-attachments/assets/fcf57fd7-9464-48b1-95ef-9edce9365eb9" />



---

## Development Workflow

Create a feature branch:

```bash
git checkout -b feature/feature-name
```

Commit changes:

```bash
git commit -m "feat: add new feature"
```

Push changes:

```bash
git push origin feature/feature-name
```

Create a Pull Request on GitHub.

---

## Coding Standards

### Commit Convention

```text
feat: add feature
fix: resolve bug
docs: update documentation
refactor: improve structure
test: add tests
chore: maintenance tasks
```

### Branch Naming

```text
feature/user-authentication
feature/chat-system
fix/login-validation
docs/update-readme
```

---

## Roadmap

### v0.2.0

* Image upload
* Profile photos
* Enhanced matching algorithm
* Better search filters

### v0.3.0

* Push notifications
* Premium features
* User verification

### v1.0.0

* Production-ready release
* Complete test coverage
* CI/CD pipeline
* Performance optimization

---

## Known Limitations

* Push notifications are not implemented.
* Media storage optimization is incomplete.
* API contracts may change before v1.0.0.

---

## Testing

Backend:

```bash
npm test
```

Frontend:

```bash
npm test
```

---

## Contributing

Contributions are welcome.

Please read:

* CONTRIBUTING.md
* CODE_OF_CONDUCT.md

before submitting Pull Requests.

---

## License

This project is licensed under the MIT License.

See the LICENSE file for details.

---

## Contributors

* Vu Tuan Dat
* Vu Duc
* Project Team Members

---

## Release Information

Current Version:

```text
v0.1.0
```

Status:

```text
Pre-release
```

This project is currently under active development and may introduce breaking changes before version 1.0.0.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
