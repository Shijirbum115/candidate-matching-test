# backend/translation/translator.py - FIXED VERSION
import requests
import logging
import hashlib
import json
from typing import Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class Translator:
    def __init__(self, settings, db=None):
        self.api_key = settings.openai_api_key
        self.base_url = "https://api.openai.com/v1/chat/completions"
        self.db = db
        self.enable_cache = getattr(settings, 'enable_translation_cache', True)
        self.cache_expiry_hours = getattr(settings, 'translation_cache_expiry_hours', 168)  # 7 days
        
        # In-memory cache for the current session (faster than DB lookups)
        self._memory_cache = {}
        self._cache_timestamps = {}
    
    def _get_text_hash(self, text: str) -> str:
        """Generate a hash for the text to use as cache key"""
        # Normalize text before hashing to improve cache hits
        normalized_text = text.strip().lower()
        return hashlib.md5(normalized_text.encode('utf-8')).hexdigest()
    
    def _get_memory_cached_translation(self, text: str) -> Optional[str]:
        """Get translation from in-memory cache"""
        if not self.enable_cache:
            return None
            
        text_hash = self._get_text_hash(text)
        
        # Check if we have it in memory and it's not expired
        if text_hash in self._memory_cache:
            timestamp = self._cache_timestamps.get(text_hash)
            if timestamp and (datetime.now() - timestamp).total_seconds() < self.cache_expiry_hours * 3600:
                logger.debug(f"Using memory cached translation for: {text[:50]}...")
                return self._memory_cache[text_hash]
            else:
                # Expired, remove from memory cache
                del self._memory_cache[text_hash]
                if text_hash in self._cache_timestamps:
                    del self._cache_timestamps[text_hash]
        
        return None
    
    def _get_db_cached_translation(self, text: str) -> Optional[str]:
        """Get cached translation from database if available and not expired"""
        if not self.enable_cache or not self.db:
            return None
            
        try:
            text_hash = self._get_text_hash(text)
            with self.db.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT translated_text, created_at
                        FROM translation_cache 
                        WHERE text_hash = %s 
                        AND (expires_at IS NULL OR expires_at > NOW())
                        ORDER BY created_at DESC
                        LIMIT 1
                    """, (text_hash,))
                    
                    result = cursor.fetchone()
                    if result:
                        logger.debug(f"Using DB cached translation for: {text[:50]}...")
                        
                        # Also store in memory cache for faster future access
                        self._memory_cache[text_hash] = result['translated_text']
                        self._cache_timestamps[text_hash] = datetime.now()
                        
                        return result['translated_text']
        except Exception as e:
            logger.error(f"Cache retrieval error: {str(e)}")
        return None
    
    def _cache_translation(self, original_text: str, translated_text: str):
        """Store translation in both memory and database cache"""
        if not self.enable_cache:
            return
            
        text_hash = self._get_text_hash(original_text)
        current_time = datetime.now()
        
        # Store in memory cache
        self._memory_cache[text_hash] = translated_text
        self._cache_timestamps[text_hash] = current_time
        
        # Store in database cache
        if self.db:
            try:
                expires_at = current_time + timedelta(hours=self.cache_expiry_hours)
                
                with self.db.get_connection() as conn:
                    with conn.cursor() as cursor:
                        cursor.execute("""
                            INSERT INTO translation_cache (text_hash, original_text, translated_text, created_at, expires_at)
                            VALUES (%s, %s, %s, %s, %s)
                            ON CONFLICT (text_hash) DO UPDATE SET
                                translated_text = EXCLUDED.translated_text,
                                created_at = EXCLUDED.created_at,
                                expires_at = EXCLUDED.expires_at
                        """, (text_hash, original_text, translated_text, current_time, expires_at))
                        
                logger.debug(f"Cached translation for: {original_text[:50]}...")
            except Exception as e:
                logger.error(f"Cache storage error: {str(e)}")
    
    def translate_mongolian_to_english(self, text: str) -> str:
        """Translate Mongolian text to English with consistent caching"""
        if not text or len(text.strip()) == 0:
            return text
        
        # Normalize input to improve cache consistency
        text = text.strip()
        
        # If text is already in English (contains mostly ASCII), return as-is
        if self._is_likely_english(text):
            logger.debug(f"Text appears to be English, returning as-is: {text[:50]}...")
            return text
        
        # Try memory cache first (fastest)
        cached_result = self._get_memory_cached_translation(text)
        if cached_result:
            return cached_result
        
        # Try database cache 
        cached_result = self._get_db_cached_translation(text)
        if cached_result:
            return cached_result
        
        # Limit input length to prevent API errors
        if len(text) > 4000:
            text = text[:4000]
        
        # Clean text to prevent injection
        text = self._clean_input_text(text)
            
        try:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            # FIXED: Use temperature=0 for completely consistent translations
            system_prompt = """You are a professional translator specializing in job-related content. Translate the given Mongolian text to English accurately and consistently.

Rules:
1. Translate technical job titles precisely (e.g., "Data Engineer" should always be "Data Engineer")
2. Keep the same structure and formatting
3. Use standard professional terminology
4. Be consistent - the same input should always produce the same output
5. Do not add explanations, just provide the translation"""
            
            data = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text}
                ],
                "max_tokens": 1000,
                "temperature": 0,  # CRITICAL: Zero temperature for consistency
                "top_p": 1,
                "frequency_penalty": 0,
                "presence_penalty": 0
            }
            
            response = requests.post(self.base_url, headers=headers, json=data, timeout=10)
            response.raise_for_status()
            
            translated_text = response.json()["choices"][0]["message"]["content"].strip()
            
            # Validate translation quality
            if self._is_valid_translation(text, translated_text):
                # Cache the translation for future use
                self._cache_translation(text, translated_text)
                logger.info(f"Successfully translated and cached: '{text[:30]}...' -> '{translated_text[:30]}...'")
                return translated_text
            else:
                logger.warning(f"Translation quality check failed, returning original: {text[:50]}...")
                return text
                
        except Exception as e:
            logger.error(f"Translation error: {str(e)}")
            return text  # Return original text if translation fails
    
    def _is_likely_english(self, text: str) -> bool:
        """Check if text is likely already in English"""
        # Simple heuristic: if more than 80% of characters are ASCII, likely English
        ascii_chars = sum(1 for c in text if ord(c) < 128)
        return (ascii_chars / len(text)) > 0.8 if text else False
    
    def _clean_input_text(self, text: str) -> str:
        """Clean input text to prevent issues"""
        # Remove potential injection patterns and normalize whitespace
        text = text.replace('\\', '').replace('\n\n\n', '\n')
        text = ' '.join(text.split())  # Normalize whitespace
        return text
    
    def _is_valid_translation(self, original: str, translated: str) -> bool:
        """Basic validation to ensure translation quality"""
        if not translated or len(translated.strip()) == 0:
            return False
        
        # Check if translation is too similar to original (might indicate failure)
        if original.lower() == translated.lower():
            return False
        
        # Check if translation is reasonable length (not too short or too long)
        length_ratio = len(translated) / len(original)
        if length_ratio < 0.3 or length_ratio > 3.0:
            return False
        
        return True
    
    def get_cache_stats(self) -> dict:
        """Get cache statistics for monitoring"""
        return {
            "memory_cache_size": len(self._memory_cache),
            "cache_enabled": self.enable_cache,
            "cache_expiry_hours": self.cache_expiry_hours
        }
    
    def clear_memory_cache(self):
        """Clear the in-memory cache"""
        self._memory_cache.clear()
        self._cache_timestamps.clear()
        logger.info("Memory cache cleared")