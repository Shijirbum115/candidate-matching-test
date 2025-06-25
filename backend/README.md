# Hybrid Candidate Search API

## Project Structure

- `app/api/`: FastAPI endpoint definitions
- `app/core/`: Configuration and OpenAI API client
- `app/db/`: PostgreSQL connection and repositories
- `app/models/`: Request and response schemas
- `app/services/`: Search logic and aggregation
- `main.py`: Entry point

## Scoring Logic Flow

1. Translate Mongolian query to English using OpenAI.
2. Generate structured query and embeddings (3072 → 1000 dims via PCA).
3. Perform hybrid search:
   - Semantic (pgvector cosine similarity)
   - Keyword (FTS in English & Mongolian)
4. Combine scores:
   `0.4 * keyword_score + 0.6 * norm_cos_sim`
5. Filter by threshold.
6. Apply experience multipliers (based on years).
7. Aggregate score per candidate and return top N.

## Setup & Run

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables (or create a .env file)
export DATABASE_URL=postgresql://user:pass@localhost/dbname
export OPENAI_API_KEY=your_key_here

# Run the app
uvicorn app.main:app --reload
