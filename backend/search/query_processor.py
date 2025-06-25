# backend/search/query_processor.py - FIXED VERSION
import logging
from typing import Tuple, List, Optional
from backend.translation.translator import Translator
from backend.embedding.generator import EmbeddingGenerator

logger = logging.getLogger(__name__)

class QueryProcessor:
    def __init__(self, settings):
        """Initialize with translator and embedding generator"""
        # Create instances rather than receiving them as parameters
        self.translator = Translator(settings)
        self.embedding_generator = EmbeddingGenerator(settings)

    def create_structured_text(self, position: str, description: str) -> str:
        """Create structured text from position and description"""
        if not position and not description:
            return ""
        
        parts = []
        if position:
            parts.append(f"Position: {position}")
        if description:
            parts.append(f"Description: {description}")
        
        return "\n".join(parts)

    def process_query(self, 
                     position_mn: str = "", 
                     description_mn: str = "") -> Tuple[str, str, str, Optional[List[float]]]:
        """
        Process the query with improved translation consistency and better structured output
        
        Returns:
            - Combined query (English) for keyword search
            - Structured Mongolian text
            - Structured English text
            - Query embedding (or None if generation fails)
        """
        try:
            # Clean and normalize inputs
            position_mn = position_mn.strip() if position_mn else ""
            description_mn = description_mn.strip() if description_mn else ""
            
            if not position_mn and not description_mn:
                logger.warning("Empty query provided")
                return "", "", "", None
            
            # Translate inputs to English with consistent caching
            position_en = ""
            description_en = ""
            
            if position_mn:
                position_en = self.translator.translate_mongolian_to_english(position_mn)
                logger.info(f"Translated position: '{position_mn}' -> '{position_en}'")
            
            if description_mn:
                description_en = self.translator.translate_mongolian_to_english(description_mn)
                logger.info(f"Translated description: '{description_mn[:50]}...' -> '{description_en[:50]}...'")
            
            # Create structured text for different purposes
            structured_mn = self.create_structured_text(position_mn, description_mn)
            structured_en = self.create_structured_text(position_en, description_en)
            
            # Create optimized query for Elasticsearch (prioritize position)
            combined_query = self._create_optimized_search_query(position_en, description_en)
            
            # Generate embedding for semantic search (fallback)
            query_embedding = None
            if structured_en:
                try:
                    raw_embedding = self.embedding_generator.generate_embedding(structured_en)
                    if raw_embedding:
                        query_embedding = self.embedding_generator.reduce_embedding(raw_embedding)
                        logger.debug(f"Generated embedding with {len(query_embedding)} dimensions")
                    else:
                        logger.warning("Failed to generate raw embedding")
                except Exception as e:
                    logger.error(f"Embedding generation error: {str(e)}")
                    query_embedding = None
            
            # Log the final processed query
            logger.info(f"Processed query - Combined: '{combined_query}', "
                       f"Has embedding: {query_embedding is not None}")
            
            return combined_query, structured_mn, structured_en, query_embedding
            
        except Exception as e:
            logger.error(f"Query processing error: {str(e)}")
            
            # Return safe defaults
            structured_mn = self.create_structured_text(position_mn, description_mn)
            # If translation fails, use original text as fallback
            structured_en = self.create_structured_text(position_mn, description_mn)
            combined_query = f"{position_mn} {description_mn}".strip()
            
            return combined_query, structured_mn, structured_en, None
    
    def _create_optimized_search_query(self, position_en: str, description_en: str) -> str:
        """
        Create an optimized search query prioritizing position title
        Now handles the fact that most titles are in Mongolian
        """
        # For position title, prefer the original input over translation
        # because "data engineer" might be stored as "дата инженер" 
        query_parts = []
        
        if position_en:
            # Use the English input for search (ES will handle translation mapping)
            cleaned_position = self._clean_position_title(position_en)
            query_parts.append(cleaned_position)
        
        if description_en:
            # Extract key terms from description
            key_terms = self._extract_key_terms(description_en)
            if key_terms:
                query_parts.extend(key_terms[:3])  # Limit to avoid query bloat
        
        return " ".join(query_parts)
    
    def _clean_position_title(self, position: str) -> str:
        """Clean and normalize position title for better matching"""
        if not position:
            return ""
        
        # Remove common noise words and normalize
        noise_words = ['position:', 'role:', 'job:', 'title:', 'as', 'a', 'an', 'the']
        
        words = position.lower().split()
        cleaned_words = []
        
        for word in words:
            # Remove punctuation and noise words
            word = word.strip('.,!?()[]{}":;')
            if word and word not in noise_words and len(word) > 1:
                cleaned_words.append(word)
        
        return " ".join(cleaned_words)
    
    def _extract_key_terms(self, description: str) -> List[str]:
        """Extract key terms from job description"""
        if not description:
            return []
        
        # Define important terms patterns for job descriptions
        important_patterns = [
            # Technical skills
            'python', 'java', 'javascript', 'sql', 'machine learning', 'ai',
            'data science', 'analytics', 'statistics', 'cloud', 'aws', 'azure',
            'kubernetes', 'docker', 'react', 'node.js', 'api', 'database',
            
            # Experience levels
            'senior', 'junior', 'lead', 'principal', 'manager', 'director',
            'entry level', 'mid level', 'experienced',
            
            # Industries
            'finance', 'banking', 'healthcare', 'technology', 'startup',
            'enterprise', 'consulting', 'government',
            
            # Job functions
            'development', 'engineering', 'analysis', 'management', 'design',
            'research', 'operations', 'strategy', 'product'
        ]
        
        description_lower = description.lower()
        found_terms = []
        
        for pattern in important_patterns:
            if pattern in description_lower:
                found_terms.append(pattern)
        
        # Also extract quoted terms (high importance)
        import re
        quoted_terms = re.findall(r'"([^"]*)"', description)
        quoted_terms.extend(re.findall(r"'([^']*)'", description))
        
        # Remove duplicates and combine
        all_terms = list(set(found_terms + quoted_terms))
        
        # Limit to most important terms to avoid query bloat
        return all_terms[:5]
    
    def get_processor_stats(self) -> dict:
        """Get processing statistics"""
        translator_stats = {}
        if hasattr(self.translator, 'get_cache_stats'):
            translator_stats = self.translator.get_cache_stats()
        
        return {
            "translator_cache": translator_stats,
            "embedding_generator_loaded": self.embedding_generator is not None
        }