# backend/search/elasticsearch_service.py - COMPLETE SIMPLE VERSION
from elasticsearch import Elasticsearch
from typing import List, Dict, Any, Optional
import logging
import re

logger = logging.getLogger(__name__)

class ElasticsearchService:
    def __init__(self, es_host: str = "localhost", es_port: int = 9200):
        """Initialize Elasticsearch for bilingual job title search"""
        self.es = Elasticsearch(
            [{'host': es_host, 'port': es_port, 'scheme': 'http'}],
            timeout=10,
            max_retries=2,
            retry_on_timeout=True
        )
        
        self.experience_index = "candidate_experiences"
        self.translator = None  # Will be set by query processor
        
        # Verify connection
        if not self.es.ping():
            raise Exception("Cannot connect to Elasticsearch")
        
        logger.info("Elasticsearch connected successfully")
        self._setup_optimized_index()

    def set_translator(self, translator):
        """Set translator for bilingual search"""
        self.translator = translator
        logger.info("Translator connected to Elasticsearch")

    def _setup_optimized_index(self):
        """Create optimized index for bilingual position title matching"""
        if not self.es.indices.exists(index=self.experience_index):
            mapping = {
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 0,
                    "analysis": {
                        "normalizer": {
                            "position_normalizer": {
                                "type": "custom",
                                "filter": ["lowercase", "asciifolding", "trim"]
                            }
                        },
                        "analyzer": {
                            "position_analyzer": {
                                "type": "custom",
                                "tokenizer": "standard",
                                "filter": ["lowercase", "asciifolding", "word_delimiter_graph"]
                            }
                        }
                    }
                },
                "mappings": {
                    "properties": {
                        "candidate_id": {"type": "integer"},
                        # ORIGINAL MONGOLIAN POSITION TITLE
                        "position_title": {
                            "type": "text",
                            "analyzer": "position_analyzer",
                            "fields": {
                                "exact": {
                                    "type": "keyword",
                                    "normalizer": "position_normalizer"
                                },
                                "raw": {"type": "keyword"}
                            }
                        },
                        # ENGLISH POSITION TITLE FOR EXACT MATCHING
                        "position_title_en": {
                            "type": "text",
                            "analyzer": "position_analyzer",
                            "fields": {
                                "exact": {
                                    "type": "keyword",
                                    "normalizer": "position_normalizer"
                                },
                                "raw": {"type": "keyword"}
                            }
                        },
                        "company_name": {
                            "type": "text",
                            "fields": {"keyword": {"type": "keyword"}}
                        },
                        "structured_content_en": {"type": "text", "analyzer": "english"},
                        "start_date": {"type": "date"},
                        "end_date": {"type": "date"},
                        "years_experience": {"type": "float"}
                    }
                }
            }
            
            self.es.indices.create(index=self.experience_index, body=mapping)
            logger.info(f"Created optimized bilingual index: {self.experience_index}")

    def search_with_priority_layers(self, query: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Search with 3-tier priority system using ENGLISH position titles
        """
        try:
            # Always convert query to English for consistent exact matching
            english_query = query.strip().lower()
            
            if self.translator:
                try:
                    if not self._is_likely_english(query):
                        # If input is Mongolian, translate to English
                        english_query = self.translator.translate_mongolian_to_english(query).lower()
                        logger.info(f"🔄 Translated query: '{query}' → '{english_query}'")
                    else:
                        # If input is English, keep as-is
                        logger.info(f"🔤 English query detected: '{english_query}'")
                except Exception as e:
                    logger.warning(f"Translation failed: {e}")

            logger.info(f"🔍 Priority search using English: '{english_query}'")

            # TIER 1: EXACT MATCHES (search position_title_en with fuzzy)
            exact_results = self._get_exact_matches_english(english_query)
            logger.info(f"Tier 1 - Exact matches: {len(exact_results)}")

            # TIER 2: RELEVANT MATCHES  
            relevant_results = []
            if len(exact_results) < limit:
                relevant_results = self._get_relevant_matches(
                    english_query, 
                    limit - len(exact_results),
                    exclude_ids=[r['id'] for r in exact_results]
                )
                logger.info(f"Tier 2 - Relevant matches: {len(relevant_results)}")

            # TIER 3: SIMILAR MATCHES
            similar_results = []
            total_so_far = len(exact_results) + len(relevant_results)
            if total_so_far < limit:
                similar_results = self._get_similar_matches(
                    english_query,
                    limit - total_so_far,
                    exclude_ids=[r['id'] for r in exact_results + relevant_results]
                )
                logger.info(f"Tier 3 - Similar matches: {len(similar_results)}")

            # Combine results with tier priority
            all_results = []
            
            for result in exact_results:
                result['match_tier'] = 'exact'
                result['tier_priority'] = 1000000
                all_results.append(result)
                
            for result in relevant_results:
                result['match_tier'] = 'relevant'
                result['tier_priority'] = 100000
                all_results.append(result)
                
            for result in similar_results:
                result['match_tier'] = 'similar'
                result['tier_priority'] = 10000
                all_results.append(result)

            # Sort by tier priority first, then by elasticsearch score
            all_results.sort(key=lambda x: (x['tier_priority'], x.get('elasticsearch_score', 0)), reverse=True)

            final_results = all_results[:limit]
            
            logger.info(f"🎯 Priority search complete: {len(final_results)} total results")
            self._log_tier_breakdown(final_results)
            
            return final_results

        except Exception as e:
            logger.error(f"Priority search error: {str(e)}")
            return []

    def _get_exact_matches_english(self, english_query: str) -> List[Dict[str, Any]]:
        """Simple exact matching using ES built-in fuzzy capabilities"""
        
        search_body = {
            "size": 50,
            "query": {
                "bool": {
                    "should": [
                        # 1. Perfect exact matches (highest priority)
                        {
                            "term": {
                                "position_title_en.exact": {
                                    "value": english_query,
                                    "boost": 100.0
                                }
                            }
                        },
                        # Case variations
                        {
                            "term": {
                                "position_title_en.exact": {
                                    "value": english_query.title(),  # "Data Engineer"
                                    "boost": 100.0
                                }
                            }
                        },
                        {
                            "term": {
                                "position_title_en.exact": {
                                    "value": english_query.upper(),  # "DATA ENGINEER"
                                    "boost": 100.0
                                }
                            }
                        },
                        
                        # 2. ES built-in fuzzy matching (handles ALL typos automatically)
                        {
                            "match": {
                                "position_title_en": {
                                    "query": english_query,
                                    "fuzziness": "AUTO",      # ES auto-adjusts fuzziness intelligently
                                    "boost": 80.0,
                                    "operator": "and",       # All words must match (with fuzziness)
                                    "prefix_length": 1       # First character must match exactly (performance)
                                }
                            }
                        },
                        
                        # 3. Phrase match for multi-word queries
                        {
                            "match_phrase": {
                                "position_title_en": {
                                    "query": english_query,
                                    "boost": 90.0
                                }
                            }
                        }
                    ]
                }
            },
            "sort": [
                {"_score": {"order": "desc"}},
                {"years_experience": {"order": "desc", "missing": "_last"}}
            ],
            "_source": ["id", "candidate_id", "position_title", "position_title_en", "company_name", 
                       "structured_content_en", "start_date", "end_date", "years_experience"]
        }
        
        try:
            result = self.es.search(index=self.experience_index, body=search_body)
            
            matches = []
            seen_ids = set()
            
            for hit in result['hits']['hits']:
                if hit['_id'] not in seen_ids:
                    doc = hit['_source']
                    doc['elasticsearch_score'] = hit['_score']
                    doc['match_type'] = 'exact'
                    
                    # Simple quality assessment based on score
                    if hit['_score'] >= 90:
                        doc['match_quality'] = 'perfect'
                    elif hit['_score'] >= 60:
                        doc['match_quality'] = 'fuzzy'
                    else:
                        doc['match_quality'] = 'partial'
                    
                    # Log the match for debugging
                    logger.debug(f"Exact match: '{english_query}' → '{doc.get('position_title_en')}' "
                               f"(Original: '{doc.get('position_title')}', Score: {hit['_score']:.1f}, Quality: {doc['match_quality']})")
                    
                    matches.append(doc)
                    seen_ids.add(hit['_id'])
            
            logger.info(f"🎯 Found {len(matches)} exact matches for '{english_query}'")
            return matches[:20]
            
        except Exception as e:
            logger.error(f"Simple exact search error: {e}")
            return []

    def _get_relevant_matches(self, english_query: str, limit: int, exclude_ids: List[str]) -> List[Dict[str, Any]]:
        """Get relevant matches using both English and original position titles"""
        
        should_clauses = [
            # Match English position title (high priority)
            {
                "match": {
                    "position_title_en": {
                        "query": english_query,
                        "boost": 2000.0,
                        "operator": "and"
                    }
                }
            },
            # Partial match English position title
            {
                "match": {
                    "position_title_en": {
                        "query": english_query,
                        "boost": 1000.0,
                        "operator": "or",
                        "minimum_should_match": "75%"
                    }
                }
            },
            # Match original position title (lower priority)
            {
                "match": {
                    "position_title": {
                        "query": english_query,
                        "boost": 500.0,
                        "operator": "and"
                    }
                }
            },
            # Content match for context
            {
                "match": {
                    "structured_content_en": {
                        "query": english_query,
                        "boost": 100.0
                    }
                }
            }
        ]

        search_body = {
            "size": limit,
            "query": {
                "bool": {
                    "should": should_clauses,
                    "must_not": [
                        {"terms": {"id": exclude_ids}}
                    ] if exclude_ids else [],
                    "minimum_should_match": 1
                }
            },
            "sort": [
                {"_score": {"order": "desc"}},
                {"years_experience": {"order": "desc", "missing": "_last"}}
            ],
            "_source": ["id", "candidate_id", "position_title", "position_title_en", "company_name", 
                       "structured_content_en", "start_date", "end_date", "years_experience"]
        }
        
        try:
            result = self.es.search(index=self.experience_index, body=search_body)
            matches = []
            
            for hit in result['hits']['hits']:
                doc = hit['_source']
                doc['elasticsearch_score'] = hit['_score']
                doc['match_type'] = 'relevant'
                matches.append(doc)
            
            return matches
            
        except Exception as e:
            logger.error(f"Relevant search error: {e}")
            return []

    def _get_similar_matches(self, english_query: str, limit: int, exclude_ids: List[str]) -> List[Dict[str, Any]]:
        """Get similar matches using broad content search"""
        search_body = {
            "size": limit,
            "query": {
                "bool": {
                    "should": [
                        {
                            "match": {
                                "structured_content_en": {
                                    "query": english_query,
                                    "boost": 100.0
                                }
                            }
                        },
                        {
                            "match": {
                                "position_title_en": {
                                    "query": english_query,
                                    "boost": 50.0,
                                    "minimum_should_match": "50%"
                                }
                            }
                        },
                        {
                            "match": {
                                "position_title": {
                                    "query": english_query,
                                    "boost": 25.0,
                                    "minimum_should_match": "50%"
                                }
                            }
                        }
                    ],
                    "must_not": [
                        {"terms": {"id": exclude_ids}}
                    ] if exclude_ids else [],
                    "minimum_should_match": 1
                }
            },
            "sort": [
                {"_score": {"order": "desc"}},
                {"years_experience": {"order": "desc", "missing": "_last"}}
            ],
            "_source": ["id", "candidate_id", "position_title", "position_title_en", "company_name", 
                       "structured_content_en", "start_date", "end_date", "years_experience"]
        }
        
        try:
            result = self.es.search(index=self.experience_index, body=search_body)
            matches = []
            
            for hit in result['hits']['hits']:
                doc = hit['_source']
                doc['elasticsearch_score'] = hit['_score']
                doc['match_type'] = 'similar'
                matches.append(doc)
            
            return matches
            
        except Exception as e:
            logger.error(f"Similar search error: {e}")
            return []

    def _is_likely_english(self, text: str) -> bool:
        """Simple heuristic to detect English vs Mongolian"""
        if not text:
            return True
        
        mongolian_chars = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'
        has_mongolian = any(char in mongolian_chars for char in text.lower())
        ascii_ratio = sum(1 for char in text if ord(char) < 128) / len(text)
        
        return not has_mongolian and ascii_ratio > 0.8

    def _log_tier_breakdown(self, results: List[Dict]):
        """Log breakdown of result tiers with position title info"""
        tier_counts = {}
        quality_counts = {}
        
        for result in results:
            tier = result.get('match_tier', 'unknown')
            quality = result.get('match_quality', 'unknown')
            tier_counts[tier] = tier_counts.get(tier, 0) + 1
            quality_counts[quality] = quality_counts.get(quality, 0) + 1
        
        logger.info(f"📊 Tier breakdown: {tier_counts}")
        logger.info(f"🎯 Quality breakdown: {quality_counts}")
        
        # Show top results from each tier with both position titles
        for tier in ['exact', 'relevant', 'similar']:
            tier_results = [r for r in results if r.get('match_tier') == tier]
            if tier_results:
                logger.info(f"🏆 Top {tier} matches:")
                for i, result in enumerate(tier_results[:3]):
                    title_en = result.get('position_title_en', 'N/A')
                    title_mn = result.get('position_title', 'N/A')
                    score = result.get('elasticsearch_score', 0)
                    years = result.get('years_experience', 0)
                    quality = result.get('match_quality', 'unknown')
                    logger.info(f"  #{i+1}: EN='{title_en}' | MN='{title_mn}' (Score: {score:.1f}, Quality: {quality}, Exp: {years:.1f}y)")

    # Compatibility methods
    def search_experiences_optimized(self, query: str, filters: Optional[Dict[str, Any]] = None, 
                                   size: int = 100) -> List[Dict[str, Any]]:
        """Main search method using priority layers"""
        return self.search_with_priority_layers(query, size)

    def test_fuzzy_search(self, query: str, max_distance: int = 2) -> List[Dict[str, Any]]:
        """Test fuzzy matching capabilities using ES built-ins"""
        
        search_body = {
            "size": 10,
            "query": {
                "bool": {
                    "should": [
                        # Perfect match
                        {
                            "term": {
                                "position_title_en.exact": {
                                    "value": query,
                                    "boost": 100.0
                                }
                            }
                        },
                        # ES built-in fuzzy match
                        {
                            "match": {
                                "position_title_en": {
                                    "query": query,
                                    "fuzziness": "AUTO",
                                    "boost": 50.0
                                }
                            }
                        }
                    ]
                }
            },
            "_source": ["position_title", "position_title_en", "candidate_id"],
            "highlight": {
                "fields": {
                    "position_title_en": {}
                }
            }
        }
        
        try:
            result = self.es.search(index=self.experience_index, body=search_body)
            
            matches = []
            for hit in result['hits']['hits']:
                doc = hit['_source']
                doc['score'] = hit['_score']
                doc['highlight'] = hit.get('highlight', {})
                matches.append(doc)
            
            return matches
        except Exception as e:
            logger.error(f"Fuzzy test error: {e}")
            return []