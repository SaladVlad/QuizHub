# QuizHub

## Environment Configuration

### Frontend Environment Variables

The frontend uses environment variables to configure API endpoints and application behavior. Create a `.env` file in the `frontend` directory with the following variables:

```env
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:5004/api
REACT_APP_IS_PRODUCTION=false
```

#### Available Environment Files:
- `.env` - Default environment variables
- `.env.development` - Development-specific variables
- `.env.production` - Production-specific variables
- `.env.example` - Example/template file

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