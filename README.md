# Candidate Search API

A production-grade FastAPI backend for candidate search that uses embeddings, semantic search, and advanced ranking algorithms to find the best matches for job positions. The system supports both Mongolian and English queries with automatic translation.

## Features

- **Semantic Search**: Uses OpenAI embeddings and pgvector to power semantic search capabilities
- **Multilingual Support**: Handles both Mongolian and English queries with automatic translation
- **Advanced Ranking**: Sophisticated scoring that factors in experience, skill matches, and semantic relevance
- **OpenAI-Powered Query Parsing**: Automatically extracts skills, positions, and requirements from natural language queries
- **RESTful API**: Well-structured FastAPI endpoints for search and candidate management
- **Docker Support**: Containerized for easy deployment with Docker and docker-compose

## Project Structure

```
candidate-search-api/
├── app/
│   ├── api/             # API routes and dependencies
│   ├── core/            # Core configuration
│   ├── db/              # Database models and connection
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic services
│   └── main.py          # FastAPI application
├── models/              # PCA model for dimension reduction
├── tests/               # Unit and integration tests
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose configuration
└── pyproject.toml       # Poetry dependencies
```

## Getting Started

### Prerequisites

- Python 3.9+
- PostgreSQL with pgvector extension
- OpenAI API key

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/candidate-search-api.git
cd candidate-search-api
```

2. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

3. Update the environment variables in the `.env` file.

4. Start the application with Docker Compose:

```bash
docker-compose up -d
```

The API will be available at http://localhost:8000.

## API Documentation

Once the application is running, you can access the API documentation at:

- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc

## Key Endpoints

- `POST /api/v1/search/`: Search for candidates with filters
- `GET /api/v1/search/parse?query={query}`: Parse a search query to extract structured information
- `GET /api/v1/candidates/{candidate_id}`: Get detailed information about a candidate
- `GET /api/v1/candidates/{candidate_id}/experiences`: Get a candidate's work experiences
- `GET /api/v1/candidates/{candidate_id}/skills`: Get a candidate's skills

## Search Query Examples

### Basic Search

```json
{
  "query": "Senior Python Developer with MongoDB experience"
}
```

### Search with Filters

```json
{
  "query": "Machine Learning Engineer",
  "experience_filter": {
    "min_years": 3,
    "current_only": true
  },
  "skill_filter": {
    "required_skills": ["TensorFlow", "PyTorch", "Python"]
  },
  "limit": 20,
  "offset": 0
}
```

## Development

### Running Tests

```bash
poetry run pytest
```

### Code Formatting

```bash
poetry run black .
poetry run isort .
```

### Type Checking

```bash
poetry run mypy .
```

## License

[MIT License](LICENSE)

## Acknowledgments

- pgvector for PostgreSQL vector search capabilities