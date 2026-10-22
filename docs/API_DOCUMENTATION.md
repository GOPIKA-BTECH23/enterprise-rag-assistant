# Enterprise RAG Chatbot - API Documentation

## Base URL
```
http://127.0.0.1:8000
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer {access_token}
```

---

## Authentication Endpoints

### POST /login
Authenticate a user and receive a JWT token.

**Request:**
```json
{
  "username": "john",
  "password": "password123",
  "role": "employee"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "username": "john",
  "role": "employee"
}
```

**Error (401 Unauthorized):**
```json
{
  "detail": "Invalid username or password"
}
```

---

### POST /logout
Invalidate the current token.

**Request:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

### POST /change-password
Change user password.

**Request:**
```json
{
  "old_password": "password123",
  "new_password": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

---

## Chat Endpoints

### POST /ask
Ask a question and get an answer with sources and metrics.

**Request:**
```json
{
  "question": "What are the company policies?"
}
```

**Response (200 OK):**
```json
{
  "answer": "Company policies include...",
  "sources": [
    {
      "filename": "employee_handbook.txt",
      "page": 2,
      "snippet": "The company believes in..."
    },
    {
      "filename": "hr_manual.pdf",
      "page": 5,
      "snippet": "Employees should always..."
    }
  ],
  "confidence": 0.87,
  "retrieval_time_ms": 142,
  "llm_time_ms": 1250,
  "total_time_ms": 1392,
  "timestamp": "2024-01-15T10:30:45Z"
}
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| question | string | The question to ask |

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| answer | string | RAG-generated answer |
| sources | array | List of source documents used |
| confidence | number | Confidence score (0-1) |
| retrieval_time_ms | number | Document retrieval time in ms |
| llm_time_ms | number | LLM inference time in ms |
| total_time_ms | number | Total response time in ms |
| timestamp | string | ISO 8601 timestamp |

**Example cURL:**
```bash
TOKEN="your_token_here"
curl -X POST http://127.0.0.1:8000/ask \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question": "What are company policies?"}'
```

---

### POST /ask-stream
Ask a question with streaming response (Server-Sent Events).

**Request:**
```json
{
  "question": "Tell me about benefits"
}
```

**Response (200 OK - SSE Stream):**
```
data: {"type":"content","content":"Company"}
data: {"type":"content","content":" provides"}
data: {"type":"content","content":" comprehensive"}
...
data: {"type":"sources","sources":[{"filename":"benefits.txt","page":1,"snippet":"..."}]}
```

**Stream Events:**
- `type: "content"` - Response text chunk
- `type: "sources"` - Sources array (at end of stream)
- `type: "error"` - Error message

**JavaScript Example:**
```javascript
const eventSource = new EventSource('/ask-stream');
const token = localStorage.getItem('token');

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'content') {
    document.getElementById('response').innerHTML += data.content;
  }
});
```

---

## User Information Endpoints

### GET /user/info
Get information about the current authenticated user.

**Response (200 OK):**
```json
{
  "username": "john",
  "role": "employee"
}
```

---

## Analytics Endpoints

### GET /analytics/stats
Get query statistics and usage data.

**Query Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| days | integer | 7 | Number of days to include |
| role | string | null | Filter by specific role |

**Response (200 OK):**
```json
{
  "total_queries": 42,
  "unique_users": 5,
  "avg_response_time_ms": 1250,
  "top_questions": [
    "What are company policies?",
    "How do I request time off?"
  ],
  "average_confidence": 0.85,
  "by_role": {
    "employee": {
      "queries": 30,
      "avg_response_time_ms": 1100
    },
    "hr": {
      "queries": 8,
      "avg_response_time_ms": 1400
    },
    "manager": {
      "queries": 4,
      "avg_response_time_ms": 1600
    }
  }
}
```

**Example cURL:**
```bash
curl -X GET "http://127.0.0.1:8000/analytics/stats?days=7" \
  -H "Authorization: Bearer $TOKEN"
```

---

### GET /analytics/performance
Get system performance metrics.

**Response (200 OK):**
```json
{
  "total_queries_today": 42,
  "min_response_time_ms": 450,
  "max_response_time_ms": 3200,
  "avg_response_time_ms": 1250,
  "median_response_time_ms": 1100,
  "p95_response_time_ms": 2800
}
```

---

### GET /analytics/activity
Get user activity history.

**Query Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| username | string | current | Username to query |
| limit | integer | 100 | Max results to return |

**Response (200 OK):**
```json
[
  {
    "timestamp": "2024-01-15T10:30:45Z",
    "question": "What are company policies?",
    "confidence": 0.87,
    "response_time_ms": 1392
  },
  {
    "timestamp": "2024-01-15T10:25:20Z",
    "question": "How do I request time off?",
    "confidence": 0.92,
    "response_time_ms": 1150
  }
]
```

---

## Admin Endpoints

### POST /admin/create-user
Create a new user (admin only).

**Request:**
```json
{
  "username": "jane",
  "password": "password123",
  "role": "hr"
}
```

**Response (200 OK):**
```json
{
  "username": "jane",
  "role": "hr",
  "message": "User created successfully"
}
```

**Error (403 Forbidden):**
```json
{
  "detail": "Admin access required"
}
```

---

### GET /admin/users
List all users (admin only).

**Response (200 OK):**
```json
{
  "users": [
    {
      "username": "john",
      "role": "employee"
    },
    {
      "username": "alice",
      "role": "hr"
    }
  ],
  "total": 2
}
```

---

### GET /admin/stats-detailed
Get detailed admin statistics.

**Response (200 OK):**
```json
{
  "total_queries": 150,
  "total_users": 8,
  "roles": ["employee", "hr", "manager", "admin"],
  "top_users": [
    {"username": "john", "queries": 45},
    {"username": "alice", "queries": 32}
  ],
  "avg_confidence": 0.86,
  "system_uptime_hours": 48
}
```

---

## Health Check Endpoints

### GET /
Basic health check.

**Response (200 OK):**
```json
{
  "status": "running",
  "version": "2.0",
  "timestamp": "2024-01-15T10:30:45Z"
}
```

---

### GET /health
Detailed health check.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "version": "2.0",
  "faiss_ready": true,
  "llm_ready": true,
  "database_ready": true,
  "uptime_seconds": 3600
}
```

---

## Error Responses

### 400 Bad Request
Invalid request parameters or format.

```json
{
  "detail": "Invalid question format"
}
```

### 401 Unauthorized
Missing or invalid authentication token.

```json
{
  "detail": "Invalid or expired token"
}
```

### 403 Forbidden
User lacks required permissions.

```json
{
  "detail": "Admin access required"
}
```

### 404 Not Found
Resource not found.

```json
{
  "detail": "User not found"
}
```

### 422 Unprocessable Entity
Validation error in request body.

```json
{
  "detail": [
    {
      "loc": ["body", "question"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### 500 Internal Server Error
Server-side error.

```json
{
  "detail": "Internal server error occurred"
}
```

---

## Rate Limiting (Future)
Currently not implemented. Future versions will include:
- 100 requests per minute per user
- 1000 requests per minute per API key

---

## Response Status Codes Summary

| Code | Meaning | Common Triggers |
|------|---------|-----------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Invalid parameters, malformed JSON |
| 401 | Unauthorized | Missing/invalid token, expired token |
| 403 | Forbidden | Insufficient permissions, admin-only endpoint |
| 404 | Not Found | Resource doesn't exist |
| 422 | Validation Error | Request body doesn't match schema |
| 500 | Server Error | LLM down, FAISS error, internal exception |

---

## Demo Credentials

For testing purposes:

| Username | Password | Role |
|----------|----------|------|
| john | password123 | employee |
| alice | password123 | hr |
| bob | password123 | manager |
| admin | admin123 | admin |

---

## Rate Limit Headers (Future)

When implemented, responses will include:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1705334400
```

---

## SDK Examples

### Python
```python
import requests

url = "http://127.0.0.1:8000/ask"
headers = {"Authorization": f"Bearer {token}"}
data = {"question": "What are policies?"}

response = requests.post(url, json=data, headers=headers)
result = response.json()
print(result['answer'])
```

### JavaScript
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://127.0.0.1:8000/ask', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({question: 'What are policies?'})
});
const result = await response.json();
console.log(result.answer);
```

---

**API Version**: 2.0  
**Last Updated**: 2024-01-15  
**Status**: Production Ready
