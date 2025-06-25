# backend/search/elasticsearch_search.py - OPTIMIZED HYBRID VERSION
from backend.search.elasticsearch_service import ElasticsearchService
from backend.database.db import Database
from typing import List, Dict, Any, Optional
import logging
import numpy as np
from datetime import datetime, date

logger = logging.getLogger(__name__)

class OptimizedHybridSearch:
    """
    Optimized hybrid search with 3-tier priority system:
    1. EXACT matches: 90% elastic + 10% vector
    2. RELEVANT matches: 50% elastic + 50% vector  
    3. SIMILAR matches: 10% elastic + 90% vector
    """
    
    def __init__(self, db: Database, es_service: ElasticsearchService):
        self.db = db
        self.es_service = es_service

    def search(self, 
               query_embedding: List[float],
               structured_en: str,
               structured_mn: str,
               filters: Optional[Dict[str, Any]] = None,
               search_method: str = "hybrid",
               limit: int = 100) -> List[Dict[str, Any]]:
        """
        Execute optimized hybrid search with tier-based scoring
        """
        try:
            logger.info(f"🔍 Optimized hybrid search: '{structured_en}' (method: {search_method})")
            
            if search_method == "elasticsearch_only":
                # Use pure Elasticsearch with priority tiers
                return self._elasticsearch_only_search(structured_en, limit)
            
            elif search_method == "semantic_only":
                # Use pure vector search
                return self._semantic_only_search(query_embedding, structured_en, structured_mn, limit)
            
            elif search_method == "hybrid":
                # Use optimized hybrid with tiers
                return self._hybrid_search_with_tiers(
                    query_embedding, structured_en, structured_mn, limit
                )
            
            else:
                # Default to elasticsearch
                return self._elasticsearch_only_search(structured_en, limit)
                
        except Exception as e:
            logger.error(f"Optimized hybrid search error: {str(e)}")
            # Fallback to PostgreSQL search
            return self.db.search_experiences(query_embedding, structured_en, structured_mn)

    def _elasticsearch_only_search(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Pure Elasticsearch search with priority tiers"""
        try:
            # Use the new priority layer search
            es_results = self.es_service.search_with_priority_layers(query, limit * 2)
            
            if not es_results:
                return []
            
            # Enrich with candidate details
            enriched_results = self._enrich_with_candidate_details(es_results)
            
            logger.info(f"Elasticsearch-only search returned {len(enriched_results)} results")
            return enriched_results[:limit]
            
        except Exception as e:
            logger.error(f"Elasticsearch-only search error: {str(e)}")
            return []

    def _semantic_only_search(self, query_embedding: List[float], 
                            structured_en: str, structured_mn: str, limit: int) -> List[Dict[str, Any]]:
        """Pure semantic vector search"""
        try:
            if not query_embedding:
                logger.warning("No query embedding available for semantic search")
                return []
            
            results = self.db.search_experiences(query_embedding, structured_en, structured_mn)
            
            # Add semantic-only markers
            for result in results:
                result['match_tier'] = 'semantic'
                result['elasticsearch_score'] = 0
                result['tier_priority'] = 50000
            
            logger.info(f"Semantic-only search returned {len(results)} results")
            return results[:limit]
            
        except Exception as e:
            logger.error(f"Semantic-only search error: {str(e)}")
            return []

    def _hybrid_search_with_tiers(self, query_embedding: List[float], 
                                structured_en: str, structured_mn: str, limit: int) -> List[Dict[str, Any]]:
        """
        Optimized hybrid search with intelligent tier-based score combination
        """
        try:
            # Get Elasticsearch results with tiers
            es_results = self.es_service.search_with_priority_layers(structured_en, limit * 2)
            
            # Get semantic results
            semantic_results = []
            if query_embedding:
                semantic_results = self.db.search_experiences(query_embedding, structured_en, structured_mn)
            
            # Combine using tier-specific weights
            combined_results = self._combine_results_with_tier_weights(es_results, semantic_results)
            
            # Enrich with candidate details
            enriched_results = self._enrich_with_candidate_details(combined_results)
            
            logger.info(f"Hybrid search returned {len(enriched_results)} combined results")
            return enriched_results[:limit]
            
        except Exception as e:
            logger.error(f"Hybrid search error: {str(e)}")
            return []

    def _combine_results_with_tier_weights(self, es_results: List[Dict], 
                                         semantic_results: List[Dict]) -> List[Dict]:
        """
        Combine ES and semantic results using tier-specific weights
        """
        # Create lookup for semantic scores
        semantic_map = {result['id']: result for result in semantic_results}
        
        combined_results = []
        seen_ids = set()
        
        # Process ES results with tier-specific weighting
        for es_result in es_results:
            exp_id = es_result['id']
            if exp_id in seen_ids:
                continue
            seen_ids.add(exp_id)
            
            # Get tier and apply appropriate weights
            tier = es_result.get('match_tier', 'similar')
            es_score = min(es_result.get('elasticsearch_score', 0) / 10000.0, 1.0)
            
            # Get semantic score if available
            semantic_score = 0.0
            if exp_id in semantic_map:
                semantic_score = semantic_map[exp_id].get('norm_cos_sim', 0)
            
            # Apply tier-specific weights
            if tier == 'exact':
                # TIER 1: 90% ES + 10% vector (prioritize exact matches)
                combined_score = (0.9 * es_score) + (0.1 * semantic_score)
                tier_priority = 1000000
            elif tier == 'relevant':
                # TIER 2: 50% ES + 50% vector (balanced for relevance)
                combined_score = (0.5 * es_score) + (0.5 * semantic_score)
                tier_priority = 100000
            else:
                # TIER 3: 10% ES + 90% vector (semantic similarity focus)
                combined_score = (0.1 * es_score) + (0.9 * semantic_score)
                tier_priority = 10000
            
            # Create enhanced result
            result = {
                **es_result,
                'combined_search_score': combined_score,
                'tier_priority': tier_priority,
                'es_component_score': es_score,
                'semantic_component_score': semantic_score,
                'final_score': tier_priority + combined_score  # For sorting
            }
            
            combined_results.append(result)
        
        # Add semantic-only results that weren't found in ES (as similar tier)
        for semantic_result in semantic_results:
            exp_id = semantic_result['id']
            if exp_id not in seen_ids:
                semantic_score = semantic_result.get('norm_cos_sim', 0)
                combined_score = 0.9 * semantic_score  # Mostly semantic
                
                result = {
                    **semantic_result,
                    'match_tier': 'semantic_only',
                    'tier_priority': 5000,  # Lower than similar
                    'combined_search_score': combined_score,
                    'es_component_score': 0.0,
                    'semantic_component_score': semantic_score,
                    'elasticsearch_score': 0.0,
                    'final_score': 5000 + combined_score
                }
                
                combined_results.append(result)
        
        # Sort by final score (tier priority + combined score)
        combined_results.sort(key=lambda x: x['final_score'], reverse=True)
        
        # Log combination stats
        tier_stats = {}
        for result in combined_results[:20]:
            tier = result.get('match_tier', 'unknown')
            tier_stats[tier] = tier_stats.get(tier, 0) + 1
        
        logger.info(f"📊 Hybrid combination - ES: {len(es_results)}, Semantic: {len(semantic_results)}")
        logger.info(f"📊 Top 20 tiers: {tier_stats}")
        
        return combined_results

    def _enrich_with_candidate_details(self, results: List[Dict]) -> List[Dict]:
        """Enrich ES results with candidate details from PostgreSQL"""
        if not results:
            return []
        
        try:
            # Get unique candidate IDs
            candidate_ids = list(set(result['candidate_id'] for result in results))
            
            # Get candidate details
            candidate_details = self._get_candidate_details(candidate_ids)
            
            # Merge candidate info with results
            enriched_results = []
            for result in results:
                candidate_id = result['candidate_id']
                candidate_info = candidate_details.get(candidate_id, {})
                
                # Merge result with candidate info
                enriched_result = {
                    **result,
                    **candidate_info,
                    # Convert dates for compatibility
                    'start_date': self._format_date(result.get('start_date')),
                    'end_date': self._format_date(result.get('end_date')),
                    # Ensure compatibility fields exist
                    'norm_cos_sim': min(result.get('elasticsearch_score', 0) / 10000.0, 1.0),
                    'enhanced_keyword_score': result.get('elasticsearch_score', 0)
                }
                
                enriched_results.append(enriched_result)
            
            return enriched_results
            
        except Exception as e:
            logger.error(f"Error enriching results: {str(e)}")
            return results

    def _get_candidate_details(self, candidate_ids: List[int]) -> Dict[int, Dict[str, Any]]:
        """Get candidate details from PostgreSQL"""
        candidate_details = {}
        
        if not candidate_ids:
            return candidate_details
        
        try:
            with self.db.get_connection() as conn:
                with conn.cursor() as cursor:
                    placeholders = ','.join(['%s'] * len(candidate_ids))
                    
                    cursor.execute(f"""
                        SELECT 
                            id,
                            first_name,
                            last_name,
                            email,
                            phone,
                            gender,
                            registration_number,
                            birthdate,
                            profile_pic,
                            resume,
                            pst_score,
                            pst_date
                        FROM candidates
                        WHERE id IN ({placeholders})
                    """, candidate_ids)
                    
                    for row in cursor.fetchall():
                        candidate_details[row['id']] = dict(row)
            
            return candidate_details
            
        except Exception as e:
            logger.error(f"Error getting candidate details: {str(e)}")
            return {}

    def _format_date(self, date_value) -> Optional[date]:
        """Format date for compatibility"""
        if not date_value:
            return None
        
        if isinstance(date_value, str):
            try:
                return datetime.fromisoformat(date_value.replace('Z', '')).date()
            except:
                return None
        
        return date_value


# Keep original HybridSearch class for backward compatibility
class HybridSearch(OptimizedHybridSearch):
    """Backward compatibility wrapper"""
    pass