# QuizHub

## Environment Configuration

### Frontend Environment Variables

The frontend uses environment variables to configure API endpoints and application behavior. Create a `.env` file in the `frontend` directory with the following variables:

```env
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:5004/api
REACT_APP_IS_PRODUCTION=false
```

#### Environment Variables:
- `REACT_APP_API_BASE_URL` - Base URL for backend API calls
- `REACT_APP_IS_PRODUCTION` - Flag to indicate production environment

### Docker Configuration

For Docker deployment, environment variables are configured in:
- `docker-compose.yml` - Production Docker configuration
- `.env.docker` - Docker environment variables (if needed)

### Development Setup

1. Copy the example environment file:
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. Update the `.env` file with your local configuration:
   ```env
   REACT_APP_API_BASE_URL=http://localhost:5004/api
   REACT_APP_IS_PRODUCTION=false
   ```

### Production Deployment

The application automatically uses production settings when deployed via Docker, with the API URL pointing to the gateway service.

### Docker Networking Solution

The frontend uses nginx as a reverse proxy to solve Docker networking issues:

**How it works:**
1. Browser makes API calls to: `http://localhost:3000/api/*`
2. Nginx (inside Docker) proxies to: `http://gateway:80/api/*`
3. Gateway service handles the request within Docker network

**Configuration Files:**
- `nginx.conf` - Proxy configuration for API requests
- `.env` - Uses `/api` (relative URL) for Docker deployment
- `.env.local` - Uses `http://localhost:5004/api` for local development

**Running the application:**
```bash
# Full Docker deployment
docker-compose up --build

# Access at: http://localhost:3000
# API calls are automatically proxied to gateway service
```