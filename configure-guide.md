# Candidate Matching System - Configuration Guide

## 1. Score Threshold (Currently: 0.4)

### Frontend Default Value
**File:** `frontend/src/components/SearchInput/index.js`
```javascript
const SearchInput = ({ onSearch, isSearching, isCompact = false, currentSearchQuery }) => {
  // ... other state
  const [scoreThreshold, setScoreThreshold] = useState(0.4); // ← CHANGE HERE
  // ...
}
```

### Backend Default Value
**File:** `backend/main.py`
```python
class SearchRequest(BaseModel):
    position: str
    description: str
    limit: int = 20
    score_threshold: float = 0.4  # ← CHANGE HERE
    fetch_education: bool = False
```

### Advanced Settings UI (if enabled)
**File:** `frontend/src/components/SearchForm.js`
```javascript
const SearchForm = ({ onSearch, isSearching, isCompact = false }) => {
  // ...
  const [scoreThreshold, setScoreThreshold] = useState(0.4); // ← CHANGE HERE
  // ...
}
```

**To enable advanced settings:**
**File:** `frontend/src/configs/config.js`
```javascript
const config = {
  showAdvancedSettings: true,  // ← SET TO TRUE to show score threshold UI
  // ...
};
```

---

## 2. Candidate Limit (Currently: 20)

### Frontend Default Value
**File:** `frontend/src/components/SearchInput/index.js`
```javascript
const SearchInput = ({ onSearch, isSearching, isCompact = false, currentSearchQuery }) => {
  // ... other state
  const [limit, setLimit] = useState(20); // ← CHANGE HERE
  // ...
}
```

### Backend Default Value
**File:** `backend/main.py`
```python
class SearchRequest(BaseModel):
    position: str
    description: str
    limit: int = 20  # ← CHANGE HERE
    score_threshold: float = 0.4
    fetch_education: bool = False
```

### Database Query Limit (Safety Net)
**File:** `backend/database/db.py`
```python
def search_experiences(self, query_embedding: List[float], structured_en: str, structured_mn: str) -> List[Dict[str, Any]]:
    # ...
    cursor.execute("""
        SELECT 
            -- ... columns
        FROM 
            candidate_experience ce
        JOIN 
            candidates c ON ce.candidate_id = c.id
        WHERE 
            ce.embedding IS NOT NULL
        ORDER BY 
            ce.embedding <=> %s::vector
        LIMIT 100  # ← SAFETY LIMIT (should be >= your max expected limit)
    """, (query_embedding, structured_en, structured_mn, query_embedding))
```

---

## 3. Keyword vs Semantic Search Weights (Currently: 40% keyword, 60% semantic)

### Main Configuration
**File:** `backend/search/candidate_scorer.py`
```python
class CandidateScorer:
    def __init__(self):
        self.keyword_weight = 0.4    # ← KEYWORD SEARCH WEIGHT (40%)
        self.semantic_weight = 0.6   # ← SEMANTIC SEARCH WEIGHT (60%)
        
    # Usage in scoring:
    # combined_score = self.keyword_weight * keyword_score + self.semantic_weight * row["norm_cos_sim"]
```

### Alternative: Configuration via Settings
**File:** `backend/config/settings.py`
```python
class Settings(BaseSettings):
    # ... other settings
    
    # Search algorithm weights
    keyword_weight: float = 0.4   # ← CHANGE HERE
    semantic_weight: float = 0.6  # ← CHANGE HERE
    
    # ... rest of settings
```

**Then update candidate_scorer.py to use settings:**
```python
class CandidateScorer:
    def __init__(self, settings=None):
        if settings:
            self.keyword_weight = settings.keyword_weight
            self.semantic_weight = settings.semantic_weight
        else:
            self.keyword_weight = 0.4  # fallback
            self.semantic_weight = 0.6  # fallback
```

---

## Quick Reference - Common Configurations

### More Strict Matching (Higher Quality)
```python
score_threshold = 0.6  # Higher threshold
limit = 10             # Fewer results
keyword_weight = 0.3   # Less keyword matching
semantic_weight = 0.7  # More semantic matching
```

### More Lenient Matching (Higher Quantity)
```python
score_threshold = 0.2  # Lower threshold
limit = 50             # More results
keyword_weight = 0.5   # More keyword matching
semantic_weight = 0.5  # Equal weighting
```

### Keyword-Heavy Search (Better for exact skill matches)
```python
score_threshold = 0.4  # Standard threshold
limit = 20             # Standard limit
keyword_weight = 0.7   # Heavy keyword matching
semantic_weight = 0.3  # Light semantic matching
```

### Semantic-Heavy Search (Better for conceptual matches)
```python
score_threshold = 0.4  # Standard threshold
limit = 20             # Standard limit
keyword_weight = 0.2   # Light keyword matching
semantic_weight = 0.8  # Heavy semantic matching
```

---

## Environment Variables (Recommended Approach)

### Create a .env file for easy configuration:
```bash
# Search Configuration
SCORE_THRESHOLD=0.4
CANDIDATE_LIMIT=20
KEYWORD_WEIGHT=0.4
SEMANTIC_WEIGHT=0.6

# Advanced Features
SHOW_ADVANCED_SETTINGS=false
SHOW_RELEVANT_JOB_HIGHLIGHTING=false
```

### Update settings.py to use environment variables:
```python
class Settings(BaseSettings):
    # ... existing settings
    
    # Search Configuration
    score_threshold: float = 0.4
    candidate_limit: int = 20
    keyword_weight: float = 0.4
    semantic_weight: float = 0.6
    
    # UI Configuration
    show_advanced_settings: bool = False
    show_relevant_job_highlighting: bool = False
    
    class Config:
        env_file = ".env"
```

---

## Testing Different Configurations

### 1. Test Score Thresholds
- **0.2**: Very lenient (more candidates, lower quality matches)
- **0.4**: Balanced (current setting)
- **0.6**: Strict (fewer candidates, higher quality matches)
- **0.8**: Very strict (very few candidates, very high quality)

### 2. Test Keyword vs Semantic Weights
- **70% Keyword / 30% Semantic**: Better for exact skill/technology matches
- **50% Keyword / 50% Semantic**: Balanced approach
- **30% Keyword / 70% Semantic**: Better for role/responsibility matches
- **20% Keyword / 80% Semantic**: Heavy conceptual matching

### 3. Monitor Results
Watch the logs for these metrics:
```
Returning X candidates with score range: Y.YY to Z.ZZ
```

Adjust parameters based on:
- Number of candidates returned
- Score range (higher is better)
- Quality of matches (manual review)