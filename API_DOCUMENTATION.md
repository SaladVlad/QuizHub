# QuizHub API Documentation

## Table of Contents
- [Authentication](#authentication)
- [User Management Endpoints](#user-management-endpoints)
- [Results Service Endpoints](#results-service-endpoints)
- [Quiz Service Endpoints](#quiz-service-endpoints)
- [Testing Notes](#testing-notes)

## Authentication

### 1. Login
- **URL**: `POST /api/users/auth/login`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "username": "user@example.com",
    "password": "yourpassword"
  }
  ```
- **Response**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "00000000-0000-0000-0000-000000000000",
      "username": "user@example.com",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "User"
    }
  }
  ```

### 2. Register
- **URL**: `POST /api/users/auth/register`
- **Auth Required**: No
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `username` (required): User's username/email
  - `email` (required): User's email
  - `password` (required): User's password
  - `firstName` (required): User's first name
  - `lastName` (required): User's last name
  - `profileImage` (optional): Profile image file
- **Response**: Same as login response with new user details and token

### 3. Get Current User
- **URL**: `GET /api/users/auth/currentUser`
- **Auth Required**: Yes
- **Response**: Returns currently authenticated user details

## User Management Endpoints

### 1. Get All Users
- **URL**: `GET /api/users?includeImages=false`
- **Auth Required**: Yes
- **Query Params**:
  - `includeImages` (default: false): Include profile images in response

### 2. Get User by ID
- **URL**: `GET /api/users/{id}?includeImage=false`
- **Auth Required**: Yes
- **Query Params**:
  - `includeImage` (default: false): Include profile image in response

### 3. Get User by Username
- **URL**: `GET /api/users/by-username/{username}?includeImage=false`
- **Auth Required**: Yes
- **Query Params**:
  - `includeImage` (default: false): Include profile image in response

### 4. Get User by Email
- **URL**: `GET /api/users/by-email/{email}?includeImage=false`
- **Auth Required**: Yes
- **Query Params**:
  - `includeImage` (default: false): Include profile image in response

### 5. Update User
- **URL**: `PUT /api/users/update`
- **Auth Required**: Yes
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `id` (required): User ID
  - `username` (optional): New username
  - `email` (optional): New email
  - `firstName` (optional): New first name
  - `lastName` (optional): New last name
  - `profileImage` (optional): New profile image
  - `removeImage` (optional): Set to true to remove current profile image

### 6. Change Password
- **URL**: `PUT /api/users/reset-password`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "userId": "00000000-0000-0000-0000-000000000000",
    "currentPassword": "currentPassword123",
    "newPassword": "newSecurePassword123"
  }
  ```

### 7. Promote to Admin
- **URL**: `PUT /api/users/{id}/promote`
- **Auth Required**: Yes (Admin only)
- **Response**: Success message

### 8. Delete User
- **URL**: `DELETE /api/users/{id}`
- **Auth Required**: Yes (Admin only)
- **Response**: Success message

## Results Service Endpoints

> **Note**: All Results Service endpoints require authentication unless otherwise noted.

### 1. Submit Quiz Result
- **URL**: `POST /api/results`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "quizId": "00000000-0000-0000-0000-000000000000",
    "score": 8.5,
    "timeTakenSeconds": 120,
    "answers": [
      {
        "questionId": "00000000-0000-0000-0000-000000000000",
        "givenAnswer": "Paris"
      }
    ]
  }
  ```

### 2. Get Result by ID
- **URL**: `GET /api/results/{id}`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "id": "00000000-0000-0000-0000-000000000000",
    "userId": "00000000-0000-0000-0000-000000000000",
    "quizId": "00000000-0000-0000-0000-000000000000",
    "score": 8.5,
    "maxPossibleScore": 10,
    "percentageScore": 85,
    "timeTakenSeconds": 120,
    "completedAt": "2025-08-10T00:00:00Z",
    "passed": true,
    "passingScore": 70,
    "answers": [
      {
        "id": "00000000-0000-0000-0000-000000000000",
        "questionId": "00000000-0000-0000-0000-000000000000",
        "givenAnswer": "Paris",
        "pointsAwarded": 1,
        "isCorrect": true,
        "explanation": "Correct answer"
      }
    ]
  }
  ```

### 3. Get User Results
- **URL**: `GET /api/results/user/{userId}?page=1&pageSize=10`
- **Auth Required**: Yes (can only access own results unless admin)
- **Query Params**:
  - `page` (default: 1)
  - `pageSize` (default: 10, max: 100)

### 4. Get Quiz Results
- **URL**: `GET /api/results/quiz/{quizId}?page=1&pageSize=10`
- **Auth Required**: No
- **Query Params**:
  - `page` (default: 1)
  - `pageSize` (default: 10, max: 100)

### 5. Get User Stats
- **URL**: `GET /api/results/stats/{userId}`
- **Auth Required**: Yes (can only access own stats unless admin)

### 6. Get Global Leaderboard
- **URL**: `GET /api/results/leaderboard/global?top=100`
- **Auth Required**: No
- **Query Params**:
  - `top` (default: 100, max: 1000)

### 7. Get Quiz Leaderboard
- **URL**: `GET /api/results/leaderboard/quiz/{quizId}?top=100`
- **Auth Required**: No
- **Query Params**:
  - `top` (default: 100, max: 1000)

### 8. Get Category Leaderboard
- **URL**: `GET /api/results/leaderboard/category/{category}?top=100`
- **Auth Required**: No
- **Query Params**:
  - `top` (default: 100, max: 1000)

## Quiz Service Endpoints

> **Note**: All Quiz Service endpoints are public (`[AllowAnonymous]`) unless otherwise noted.

### 1. Get Quiz by ID
- **URL**: `GET /api/quizzes/{id}`
- **Auth Required**: No
- **Response**:
  ```json
  {
    "id": "00000000-0000-0000-0000-000000000000",
    "title": "Sample Quiz",
    "description": "A sample quiz",
    "category": "General Knowledge",
    "difficulty": 2,
    "timeLimitSeconds": 300,
    "questions": [
      {
        "id": "00000000-0000-0000-0000-000000000000",
        "text": "What is the capital of France?",
        "questionType": 1,
        "answers": [
          {
            "id": "00000000-0000-0000-0000-000000000000",
            "text": "Paris",
            "isCorrect": true
          }
        ]
      }
    ]
  }
  ```

### 2. Get All Quizzes
- **URL**: `GET /api/quizzes?page=1&pageSize=10`
- **Auth Required**: No
- **Query Params**:
  - `page` (default: 1)
  - `pageSize` (default: 10, max: 100)

### 3. Get Quizzes by Category
- **URL**: `GET /api/quizzes/category/{category}?page=1&pageSize=10`
- **Auth Required**: No
- **Query Params**:
  - `page` (default: 1)
  - `pageSize` (default: 10, max: 100)

### 4. Create Quiz
- **URL**: `POST /api/quizzes`
- **Auth Required**: Yes (Admin or Teacher role)
- **Request Body**:
  ```json
  {
    "title": "New Quiz",
    "description": "A new quiz",
    "category": "History",
    "difficulty": 3,
    "timeLimitSeconds": 600,
    "questions": [
      {
        "text": "In which year did World War II end?",
        "questionType": 1,
        "answers": [
          {
            "text": "1945",
            "isCorrect": true
          },
          {
            "text": "1939",
            "isCorrect": false
          }
        ]
      }
    ]
  }
  ```

### 5. Update Quiz
- **URL**: `PUT /api/quizzes/{id}`
- **Auth Required**: Yes (Admin role only)
- **Request Body**: Same as Create Quiz

### 6. Delete Quiz
- **URL**: `DELETE /api/quizzes/{id}`
- **Auth Required**: Yes (Admin role only)

## Testing Notes

### Authentication
1. **Obtain Token**:
   - Make a POST request to `/api/users/auth/login` with valid credentials
   - Extract the `token` from the response

2. **Using the Token**:
   - Add to request headers: `Authorization: Bearer <your_token>`
   - Token is required for most endpoints (except those marked as `[AllowAnonymous]`)

### Common Headers
- `Content-Type: application/json` for JSON data
- `Accept: application/json` to receive JSON responses
- `Authorization: Bearer <token>` for authenticated requests

### Rate Limiting
- Authentication endpoints: 5 requests per minute per IP
- Other endpoints: 100 requests per minute per token

### Error Responses
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate email)
- `500 Internal Server Error`: Server error (check logs)

### Best Practices
1. Always check the response status code
2. Handle token expiration (typically 60 minutes)
3. Use pagination for large datasets
4. Validate all user input on the client side
5. Implement proper error handling
