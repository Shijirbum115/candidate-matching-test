# backend/main.py - FIXED VERSION
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.config.settings import Settings
from backend.database.db import Database
from backend.search.query_processor import QueryProcessor
from backend.search.candidate_scorer import OptimizedCandidateScorer
from backend.search.elasticsearch_service import ElasticsearchService
from backend.search.elasticsearch_search import OptimizedHybridSearch
from pydantic import BaseModel
import logging
from typing import Any, Dict, List, Optional
from datetime import date, datetime
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances (singletons)
_database_instance = None
_elasticsearch_service = None
_hybrid_search_instance = None
_query_processor_instance = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    try:
        get_database_instance()
        get_elasticsearch_service()
        get_hybrid_search_instance()
        logger.info("🚀 Optimized search system started successfully")
    except Exception as e:
        logger.error(f"Failed to start application: {str(e)}")
        raise
    
    yield  # Application runs here
    
    # Shutdown
    cleanup_instances()
    logger.info("Application shutdown complete")

app = FastAPI(title="Optimized Tier-Based Candidate Search System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

def get_database_instance():
    """Get or create database instance (singleton)"""
    global _database_instance
    if _database_instance is None:
        settings = Settings()
        if not settings.openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key is missing")
        if not settings.pg_db_name:
            raise HTTPException(status_code=500, detail="Database name is missing")
        
        try:
            _database_instance = Database(settings)
            logger.info("Database instance created successfully")
        except Exception as e:
            logger.error(f"Database initialization error: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to connect to database")
    
    return _database_instance

def get_elasticsearch_service():
    """Get or create Elasticsearch service instance (singleton)"""
    global _elasticsearch_service
    if _elasticsearch_service is None:
        try:
            _elasticsearch_service = ElasticsearchService()
            logger.info("✅ Elasticsearch service initialized with tier-based search")
        except Exception as e:
            logger.error(f"Elasticsearch initialization error: {str(e)}")
            logger.warning("⚠️ Continuing without Elasticsearch - will use PostgreSQL fallback")
            _elasticsearch_service = None
    
    return _elasticsearch_service

def get_hybrid_search_instance():
    """Get or create optimized hybrid search instance (singleton)"""
    global _hybrid_search_instance
    if _hybrid_search_instance is None:
        db = get_database_instance()
        es_service = get_elasticsearch_service()
        
        if es_service:
            try:
                _hybrid_search_instance = OptimizedHybridSearch(db, es_service)
                
                # Connect translator for bilingual search
                query_processor = get_query_processor_instance()
                if query_processor and hasattr(query_processor, 'translator'):
                    es_service.set_translator(query_processor.translator)
                    logger.info("🌐 Bilingual search enabled with translator")
                
                logger.info("🎯 Optimized hybrid search initialized with tier system")
            except Exception as e:
                logger.error(f"Hybrid search initialization error: {str(e)}")
                _hybrid_search_instance = None
        else:
            _hybrid_search_instance = None
    
    return _hybrid_search_instance

def get_query_processor_instance():
    """Get or create query processor instance (singleton)"""
    global _query_processor_instance
    if _query_processor_instance is None:
        settings = Settings()
        _query_processor_instance = QueryProcessor(settings)
        logger.info("Query processor instance created successfully")
    
    return _query_processor_instance

def cleanup_instances():
    """Cleanup instances on shutdown"""
    global _database_instance, _elasticsearch_service, _hybrid_search_instance, _query_processor_instance
    
    if _database_instance:
        Database.close_all_connections()
        logger.info("Database connections cleaned up")
    
    if _query_processor_instance and hasattr(_query_processor_instance.translator, 'clear_memory_cache'):
        _query_processor_instance.translator.clear_memory_cache()
        logger.info("Translation cache cleared")
    
    _elasticsearch_service = None
    _hybrid_search_instance = None
    _query_processor_instance = None

# Pydantic models
class SearchRequest(BaseModel):
    position: str
    description: str
    limit: int = 100
    score_threshold: float = 0.1  # Lower threshold for tier system
    fetch_education: bool = False
    
    # Search method selection  
    search_method: str = "elasticsearch"  # Default to pure elasticsearch with tiers
    
    # Hybrid search weights (for hybrid method)
    es_weight: Optional[float] = 0.7
    semantic_weight: Optional[float] = 0.3
    
    # Filter data
    filters: Optional[Dict[str, str]] = None
    activeFilters: Optional[Dict[str, bool]] = None

# Dependencies
def get_settings():
    return Settings()

def get_database():
    return get_database_instance()

def get_elasticsearch():
    return get_elasticsearch_service()

def get_hybrid_search():
    return get_hybrid_search_instance()

def get_query_processor():
    return get_query_processor_instance()

def get_candidate_scorer():
    return OptimizedCandidateScorer()

# FIXED: Single unified search endpoint that creates search records for saving
@app.post("/search")
@limiter.limit("20/minute")
async def search_candidates(
    request: Request,
    search_request: SearchRequest,
    db: Database = Depends(get_database),
    query_processor: QueryProcessor = Depends(get_query_processor),
    scorer: OptimizedCandidateScorer = Depends(get_candidate_scorer),
    hybrid_search: Optional[OptimizedHybridSearch] = Depends(get_hybrid_search),
    es_service: Optional[ElasticsearchService] = Depends(get_elasticsearch)
):
    """
    Enhanced search endpoint that creates a search record for saving candidates
    """
    try:
        # Process query with bilingual support
        combined_query, structured_mn, structured_en, query_embedding = query_processor.process_query(
            position_mn=search_request.position,
            description_mn=search_request.description
        )
        
        if not combined_query and not structured_en:
            raise HTTPException(status_code=400, detail="Invalid or empty search query")
        
        # Log search details
        search_method = search_request.search_method
        logger.info(f"🔍 TIER-BASED SEARCH: '{combined_query}' (method: {search_method})")
        
        # Execute search based on method - FIXED parameter passing
        if search_method == "elasticsearch" and hybrid_search:
            logger.info(f"🎯 Using TIER-BASED Elasticsearch search")
            results = hybrid_search.search(
                query_embedding=query_embedding or [],
                structured_en=combined_query,
                structured_mn=structured_mn,
                filters=search_request.filters,
                search_method="elasticsearch_only",
                limit=search_request.limit * 2
            )
            
        elif search_method == "hybrid" and hybrid_search:
            logger.info(f"🔀 Using HYBRID search with tier weighting")
            results = hybrid_search.search(
                query_embedding=query_embedding or [],
                structured_en=combined_query,
                structured_mn=structured_mn,
                filters=search_request.filters,
                search_method="hybrid",
                # REMOVED: es_weight and semantic_weight - these are handled internally
                limit=search_request.limit * 2
            )
            
        elif search_method == "semantic":
            logger.info("🧠 Using semantic search only")
            if query_embedding is None:
                raise HTTPException(status_code=500, detail="Failed to generate query embedding")
            
            if hybrid_search:
                results = hybrid_search.search(
                    query_embedding=query_embedding,
                    structured_en=structured_en,
                    structured_mn=structured_mn,
                    search_method="semantic_only",
                    limit=search_request.limit
                )
            else:
                results = db.search_experiences(query_embedding, structured_en, structured_mn)
                
        else:
            # Fallback to PostgreSQL search
            logger.info("📊 Using PostgreSQL fallback search")
            if query_embedding is None:
                raise HTTPException(status_code=500, detail="Failed to generate query embedding")
            results = db.search_experiences(query_embedding, structured_en, structured_mn)
        
        # Score and rank candidates with tier awareness
        candidates = scorer.score_and_rank_candidates(
            results=results,
            score_threshold=search_request.score_threshold,
            limit=search_request.limit
        )
        
        # Convert to response format
        response_data = []
        for candidate in candidates:
            candidate_dict = candidate.dict()
            response_data.append(candidate_dict)
        
        # Add education data if requested
        if search_request.fetch_education and response_data:
            try:
                candidate_ids = [candidate_dict["candidate_id"] for candidate_dict in response_data]
                education_data = db.get_batch_education(candidate_ids)
                
                for candidate_dict in response_data:
                    cid = candidate_dict["candidate_id"]
                    candidate_dict["education"] = education_data.get(cid, [])
            except Exception as edu_err:
                logger.error(f"Failed to get education data: {str(edu_err)}")
        
        # Create search record if there are results (for saving candidates later)
        search_id = None
        if response_data:
            try:
                search_name = search_request.position or "Untitled Search"
                search_query = {
                    "position": search_request.position,
                    "description": search_request.description,
                    "timestamp": datetime.now().isoformat(),
                    "results_count": len(response_data),
                    "search_method": search_method,
                    "filters": search_request.filters or {}
                }
                
                search_id = db.save_search(1, search_name, search_query)  # Default user_id = 1
                logger.info(f"Created search record with ID: {search_id}")
                
            except Exception as save_err:
                logger.error(f"Failed to create search record: {str(save_err)}")
                # Don't fail the whole search if saving fails
                pass
        
        # Return enhanced response with search_id for frontend compatibility
        return {
            "search_id": search_id,
            "candidates": response_data,
            "search_query": {
                "position": search_request.position,
                "description": search_request.description,
                "results_count": len(response_data)
            } if response_data else None
        }
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# CANDIDATE SAVING ENDPOINTS
@app.post("/save_candidate")
@limiter.limit("10/minute")
async def save_candidate_endpoint(
    request: Request,
    data: dict,
    db: Database = Depends(get_database)
):
    """Save a candidate to a search"""
    try:
        search_id = data.get('search_id')
        candidate_id = data.get('candidate_id')
        note = data.get('note', '')
        
        if not search_id or not candidate_id:
            raise HTTPException(status_code=400, detail="search_id and candidate_id are required")
        
        saved_id = db.save_candidate(search_id, candidate_id, note)
        return {"id": saved_id, "message": "Candidate saved successfully"}
    except Exception as e:
        logger.error(f"Failed to save candidate: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save candidate: {str(e)}")

@app.delete("/save_candidate/{search_id}/{candidate_id}")
@limiter.limit("10/minute") 
async def unsave_candidate_endpoint(
    request: Request,
    search_id: int,
    candidate_id: int,
    db: Database = Depends(get_database)
):
    """Remove a saved candidate"""
    try:
        db.unsave_candidate(search_id, candidate_id)
        return {"message": "Candidate unsaved successfully"}
    except Exception as e:
        logger.error(f"Failed to unsave candidate: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to unsave candidate: {str(e)}")

@app.get("/saved_candidates/{search_id}")
async def get_saved_candidates_endpoint(
    search_id: int,
    db: Database = Depends(get_database)
):
    """Get all saved candidates for a search"""
    try:
        return db.get_saved_candidates(search_id)
    except Exception as e:
        logger.error(f"Failed to get saved candidates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get saved candidates: {str(e)}")

@app.get("/saved_searches_with_candidates/{user_id}")
async def get_saved_searches_with_candidates_endpoint(
    user_id: int = 1,
    db: Database = Depends(get_database)
):
    """Get saved searches but only those with saved candidates"""
    try:
        return db.get_saved_searches_with_candidate_count(user_id)
    except Exception as e:
        logger.error(f"Failed to get saved searches with candidates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get saved searches: {str(e)}")

@app.get("/is_candidate_saved/{search_id}/{candidate_id}")
async def check_candidate_saved_endpoint(
    search_id: int,
    candidate_id: int,
    db: Database = Depends(get_database)
):
    """Check if a candidate is saved for a specific search"""
    try:
        is_saved = db.is_candidate_saved(search_id, candidate_id)
        return {"is_saved": is_saved}
    except Exception as e:
        logger.error(f"Failed to check if candidate is saved: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check saved status: {str(e)}")

# ELASTICSEARCH ENDPOINTS
@app.get("/elasticsearch/health")
async def elasticsearch_health(
    es_service: Optional[ElasticsearchService] = Depends(get_elasticsearch)
):
    """Check Elasticsearch health"""
    try:
        if not es_service:
            return {
                "status": "unavailable",
                "message": "Elasticsearch service not initialized"
            }
        
        cluster_health = es_service.es.cluster.health()
        
        # Check index status
        index_status = {}
        try:
            if es_service.es.indices.exists(index=es_service.experience_index):
                count = es_service.es.count(index=es_service.experience_index)
                index_status[es_service.experience_index] = {
                    "exists": True,
                    "count": count['count']
                }
            else:
                index_status[es_service.experience_index] = {
                    "exists": False,
                    "count": 0
                }
        except Exception as e:
            index_status[es_service.experience_index] = {
                "error": str(e)
            }
        
        return {
            "status": "available",
            "cluster_health": cluster_health,
            "indices": index_status,
            "tier_search_enabled": True
        }
        
    except Exception as e:
        logger.error(f"Elasticsearch health check error: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }

@app.post("/elasticsearch/reindex")
async def reindex_elasticsearch(
    request: Request,
    es_service: Optional[ElasticsearchService] = Depends(get_elasticsearch),
    db: Database = Depends(get_database)
):
    """Trigger reindexing with optimized mappings including position_title_en"""
    try:
        if not es_service:
            raise HTTPException(status_code=503, detail="Elasticsearch not available")
        
        logger.info("🔄 Starting optimized reindex with bilingual position titles...")
        
        # Get all experiences from database INCLUDING position_title_en
        with db.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        ce.id, 
                        ce.candidate_id, 
                        ce.position_title,
                        ce.position_title_en,
                        ce.company_name,
                        ce.structured_content_en, 
                        ce.start_date, 
                        ce.end_date,
                        CASE WHEN ce.end_date IS NULL THEN 
                            (CURRENT_DATE - ce.start_date) / 365.25
                        ELSE (ce.end_date - ce.start_date) / 365.25
                        END as years_experience
                    FROM candidate_experience ce
                    WHERE ce.structured_content_en IS NOT NULL
                        AND ce.position_title IS NOT NULL 
                        AND ce.position_title != ''
                        AND ce.position_title_en IS NOT NULL
                        AND ce.position_title_en != ''
                    ORDER BY ce.id
                """)
                
                experiences = cursor.fetchall()
        
        # Clear and recreate index with optimized mappings
        if es_service.es.indices.exists(index=es_service.experience_index):
            es_service.es.indices.delete(index=es_service.experience_index)
        
        es_service._setup_optimized_index()
        
        # Index in batches
        batch_size = 100
        indexed_count = 0
        
        for i in range(0, len(experiences), batch_size):
            batch = experiences[i:i + batch_size]
            
            bulk_operations = []
            for exp in batch:
                doc = {
                    "id": exp['id'],
                    "candidate_id": exp['candidate_id'],
                    "position_title": exp['position_title'] or "",
                    "position_title_en": exp['position_title_en'] or "",
                    "company_name": exp['company_name'] or "",
                    "structured_content_en": exp['structured_content_en'] or "",
                    "start_date": exp['start_date'].isoformat() if exp['start_date'] else None,
                    "end_date": exp['end_date'].isoformat() if exp['end_date'] else None,
                    "years_experience": float(exp['years_experience']) if exp['years_experience'] else 0.0
                }
                
                bulk_operations.append({"index": {"_index": es_service.experience_index, "_id": exp['id']}})
                bulk_operations.append(doc)
            
            response = es_service.es.bulk(body=bulk_operations, refresh=False)
            if not response.get('errors'):
                indexed_count += len(batch)
        
        es_service.es.indices.refresh(index=es_service.experience_index)
        
        return {
            "status": "success",
            "message": f"Successfully reindexed {indexed_count} documents with bilingual position titles",
            "indexed_count": indexed_count,
            "total_experiences": len(experiences),
            "bilingual_search_enabled": True
        }
        
    except Exception as e:
        logger.error(f"Reindex error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to reindex: {str(e)}")

# TEST ENDPOINTS
@app.get("/search/test/{query}")
async def test_tier_search(
    query: str,
    hybrid_search: Optional[OptimizedHybridSearch] = Depends(get_hybrid_search),
    query_processor: QueryProcessor = Depends(get_query_processor)
):
    """Test endpoint to demonstrate tier-based search"""
    try:
        if not hybrid_search:
            return {"error": "Elasticsearch not available"}
        
        # Process query
        combined_query, structured_mn, structured_en, query_embedding = query_processor.process_query(
            position_mn=query,
            description_mn=""
        )
        
        # Test Elasticsearch only (with tiers)
        es_results = hybrid_search.search(
            query_embedding=query_embedding or [],
            structured_en=combined_query,
            structured_mn=structured_mn,
            search_method="elasticsearch_only",
            limit=20
        )
        
        # Group by tier
        tier_results = {}
        for result in es_results:
            tier = result.get('match_tier', 'unknown')
            if tier not in tier_results:
                tier_results[tier] = []
            tier_results[tier].append({
                "position_title": result.get('position_title'),
                "elasticsearch_score": result.get('elasticsearch_score'),
                "years_experience": result.get('years_experience', 0)
            })
        
        return {
            "query": query,
            "translated_query": combined_query,
            "total_results": len(es_results),
            "tier_breakdown": {tier: len(results) for tier, results in tier_results.items()},
            "results_by_tier": tier_results
        }
        
    except Exception as e:
        logger.error(f"Test search error: {str(e)}")
        return {"error": str(e)}

# LEGACY ENDPOINTS FOR COMPATIBILITY
@app.get("/candidate_education/{candidate_id}")
async def get_candidate_education(
    candidate_id: int,
    db: Database = Depends(get_database)
):
    try:
        return db.get_candidate_education(candidate_id)
    except Exception as e:
        logger.error(f"Failed to get candidate education: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get candidate education: {str(e)}")

@app.get("/candidate_all_experiences/{candidate_id}")
async def get_candidate_all_experiences(
    candidate_id: int,
    db: Database = Depends(get_database)
):
    try:
        return db.get_candidate_all_experiences(candidate_id)
    except Exception as e:
        logger.error(f"Failed to get candidate all experiences: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get candidate all experiences: {str(e)}")

@app.post("/batch_education")
async def get_batch_education(
    candidate_ids: List[int],
    db: Database = Depends(get_database)
):
    try:
        return db.get_batch_education(candidate_ids)
    except Exception as e:
        logger.error(f"Failed to get batch education: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get batch education: {str(e)}")

@app.post("/save_search")
async def save_search_endpoint(
    request: dict,
    db: Database = Depends(get_database)
):
    try:
        user_id = request.get('user_id', 1)
        search_name = request.get('search_name', '')
        search_query = request.get('search_query', {})
        
        search_id = db.save_search(user_id, search_name, search_query)
        return {"id": search_id, "message": "Search saved successfully"}
    except Exception as e:
        logger.error(f"Failed to save search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save search: {str(e)}")

@app.get("/saved_searches/{user_id}")
async def get_saved_searches_endpoint(
    user_id: int = 1,
    db: Database = Depends(get_database)
):
    try:
        return db.get_saved_searches(user_id)
    except Exception as e:
        logger.error(f"Failed to get saved searches: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get saved searches: {str(e)}")

@app.get("/candidate_applications/{candidate_id}")
async def get_candidate_applications(
    candidate_id: int,
    db: Database = Depends(get_database)
):
    try:
        return db.get_candidate_applications(candidate_id)
    except Exception as e:
        logger.error(f"Failed to get candidate applications: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get candidate applications: {str(e)}")

@app.post("/batch_applications")
async def get_batch_applications(
    candidate_ids: List[int],
    db: Database = Depends(get_database)
):
    try:
        return db.get_batch_applications(candidate_ids)
    except Exception as e:
        logger.error(f"Failed to get batch applications: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get batch applications: {str(e)}")