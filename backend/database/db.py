# backend/database/db.py
import json
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from pgvector.psycopg2 import register_vector
from typing import List, Dict, Any
import logging
import threading
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class Database:
    _pool = None
    _lock = threading.Lock()
    
    def __init__(self, settings):
        self.settings = settings
        self._initialize_pool()
        
    def _initialize_pool(self):
        """Initialize connection pool (thread-safe singleton)"""
        if Database._pool is None:
            with Database._lock:
                if Database._pool is None:  # Double-check
                    try:
                        Database._pool = psycopg2.pool.ThreadedConnectionPool(
                            minconn=2,  # Minimum connections in pool
                            maxconn=20,  # Maximum connections in pool
                            host=self.settings.pg_db_host,
                            port=self.settings.pg_db_port,
                            dbname=self.settings.pg_db_name,
                            user=self.settings.pg_db_user,
                            password=self.settings.pg_db_password,
                            cursor_factory=RealDictCursor
                        )
                        logger.info(f"Database connection pool initialized (min: 2, max: 20)")
                        
                        # Register vector extension on a test connection
                        with self.get_connection() as conn:
                            register_vector(conn)
                            logger.info("Vector extension registered successfully")
                            
                    except Exception as e:
                        logger.error(f"Failed to create connection pool: {str(e)}")
                        raise
    
    @contextmanager
    def get_connection(self):
        """Context manager to get and return connection from pool"""
        conn = None
        try:
            conn = Database._pool.getconn()
            if conn.closed:
                logger.warning("Got closed connection from pool, getting new one")
                Database._pool.putconn(conn, close=True)
                conn = Database._pool.getconn()
            
            register_vector(conn)  # Ensure vector is registered for this connection
            yield conn
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error: {str(e)}")
            raise
        finally:
            if conn:
                try:
                    conn.commit()
                    Database._pool.putconn(conn)
                except Exception as e:
                    logger.error(f"Error returning connection to pool: {str(e)}")
                    Database._pool.putconn(conn, close=True)

    @classmethod
    def close_all_connections(cls):
        """Close all connections in the pool"""
        if cls._pool:
            cls._pool.closeall()
            cls._pool = None
            logger.info("All database connections closed")
    
    def search_experiences(self, query_embedding: List[float], structured_en: str, structured_mn: str) -> List[Dict[str, Any]]:
        """Search experiences using connection pool - Updated to include position_title_en"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT 
                            ce.id, 
                            ce.candidate_id, 
                            ce.structured_content_en, 
                            ce.structured_content_mn, 
                            ce.start_date, 
                            ce.end_date, 
                            ce.company_name, 
                            ce.position_title,
                            ce.position_title_en,  -- 🆕 NEW: Include English position title
                            (1 - (ce.embedding <=> %s::vector) + 1) / 2 AS norm_cos_sim,
                            ts_rank(ce.fts_vector_en, plainto_tsquery('english', %s)) AS fts_vector_en_rank,
                            ts_rank(ce.fts_vector_mn, plainto_tsquery('simple', %s)) AS fts_vector_mn_rank,
                            c.first_name, 
                            c.last_name, 
                            c.email, 
                            c.phone, 
                            c.gender, 
                            c.registration_number, 
                            c.birthdate,
                            c.profile_pic,
                            c.resume,
                            c.pst_score,
                            c.pst_date
                        FROM 
                            candidate_experience ce
                        JOIN 
                            candidates c ON ce.candidate_id = c.id
                        WHERE 
                            ce.embedding IS NOT NULL
                            AND ce.position_title_en IS NOT NULL  -- 🆕 NEW: Ensure English title exists
                            AND ce.position_title_en != ''
                        ORDER BY 
                            ce.embedding <=> %s::vector
                        LIMIT 100
                    """, (query_embedding, structured_en, structured_mn, query_embedding))
                    
                    return cursor.fetchall()
                    
        except Exception as e:
            logger.error(f"Search experiences error: {str(e)}")
        raise

    def get_candidate_education(self, candidate_id: int) -> List[Dict[str, Any]]:
        """Get candidate education using connection pool"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT institution, degree_name, field_of_study, gpa, start_year, end_year
                        FROM candidate_education
                        WHERE candidate_id = %s
                        ORDER BY end_year DESC
                    """, (candidate_id,))
                    return cursor.fetchall()
                    
        except Exception as e:
            logger.error(f"Get candidate education error: {str(e)}")
            raise

    def save_search(self, user_id: int, search_name: str, search_query: Dict[str, Any]) -> int:
        """Save search using connection pool"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO saved_searches (user_id, search_name, search_query, created_at)
                        VALUES (%s, %s, %s, NOW())
                        RETURNING id
                    """, (user_id, search_name, json.dumps(search_query)))
                    return cursor.fetchone()["id"]
                    
        except Exception as e:
            logger.error(f"Save search error: {str(e)}")
            raise

    def save_candidate(self, saved_search_id: int, candidate_id: int, note: str = "") -> int:
        """Save candidate using connection pool"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO saved_candidates (saved_search_id, candidate_id, note, created_at)
                        VALUES (%s, %s, %s, NOW())
                        RETURNING id
                    """, (saved_search_id, candidate_id, note))
                    return cursor.fetchone()["id"]
                    
        except Exception as e:
            logger.error(f"Save candidate error: {str(e)}")
            raise

    def get_saved_searches(self, user_id: int) -> List[Dict[str, Any]]:
        """Get saved searches using connection pool"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT ss.id, ss.search_name, ss.search_query, ss.created_at,
                            ARRAY_AGG(sc.candidate_id) as saved_candidates
                        FROM saved_searches ss
                        LEFT JOIN saved_candidates sc ON ss.id = sc.saved_search_id
                        WHERE ss.user_id = %s
                        GROUP BY ss.id
                        ORDER BY ss.created_at DESC
                    """, (user_id,))
                    return cursor.fetchall()
                    
        except Exception as e:
            logger.error(f"Get saved searches error: {str(e)}")
            raise

    def get_batch_education(self, candidate_ids: List[int]) -> Dict[int, List[Dict[str, Any]]]:
        """Fetch education data for multiple candidates using connection pool"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    placeholders = ','.join(['%s'] * len(candidate_ids))
                    
                    cursor.execute(f"""
                        SELECT 
                            candidate_id, 
                            institution, 
                            degree_name, 
                            field_of_study, 
                            gpa, 
                            start_year, 
                            end_year
                        FROM 
                            candidate_education
                        WHERE 
                            candidate_id IN ({placeholders})
                        ORDER BY 
                            candidate_id, 
                            end_year DESC
                    """, candidate_ids)
                    
                    results = cursor.fetchall()
                    
                    # Group by candidate_id
                    education_by_candidate = {}
                    for row in results:
                        candidate_id = row["candidate_id"]
                        if candidate_id not in education_by_candidate:
                            education_by_candidate[candidate_id] = []
                        
                        education_data = {
                            "institution": row["institution"],
                            "degree_name": row["degree_name"],
                            "field_of_study": row["field_of_study"],
                            "gpa": row["gpa"],
                            "start_year": row["start_year"],
                            "end_year": row["end_year"]
                        }
                        
                        education_by_candidate[candidate_id].append(education_data)
                    
                    return education_by_candidate
                    
        except Exception as e:
            logger.error(f"Get batch education error: {str(e)}")
            raise

    def prefetch_profile_images(self, candidate_ids: List[int]) -> Dict[int, str]:
        """Prefetch profile image URLs for multiple candidates using connection pool"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    placeholders = ','.join(['%s'] * len(candidate_ids))
                    
                    cursor.execute(f"""
                        SELECT 
                            id, 
                            profile_pic
                        FROM 
                            candidates
                        WHERE 
                            id IN ({placeholders})
                    """, candidate_ids)
                    
                    results = cursor.fetchall()
                    
                    # Create mapping of candidate_id to profile_pic URL
                    profile_pics = {}
                    for row in results:
                        profile_pics[row["id"]] = row["profile_pic"]
                    
                    return profile_pics
                    
        except Exception as e:
            logger.error(f"Prefetch profile images error: {str(e)}")
            raise

    def get_candidate_all_experiences(self, candidate_id: int) -> List[Dict[str, Any]]:
        """Get all experiences for a candidate using connection pool"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT 
                            company_name,
                            position_title,
                            start_date,
                            end_date,
                            structured_content_en as content,
                            structured_content_mn,
                            work_description,
                            CASE 
                                WHEN end_date IS NULL THEN 
                                    (CURRENT_DATE - start_date) / 365.25
                                ELSE 
                                    (end_date - start_date) / 365.25
                            END as years
                        FROM candidate_experience
                        WHERE candidate_id = %s
                        ORDER BY start_date DESC
                    """, (candidate_id,))
                    
                    results = cursor.fetchall()
                    logger.info(f"Found {len(results)} total experiences for candidate {candidate_id}")
                    
                    experiences = []
                    for row in results:
                        exp_dict = dict(row)
                        # Ensure years is a float
                        exp_dict['years'] = float(exp_dict['years']) if exp_dict['years'] else 0.0
                        # Use structured_content_en if available, otherwise use work_description
                        if not exp_dict.get('content') and exp_dict.get('work_description'):
                            exp_dict['content'] = exp_dict['work_description']
                        
                        # Ensure start_date and end_date are properly formatted
                        # Convert dates to strings for JSON serialization if they're date objects
                        if exp_dict.get('start_date'):
                            exp_dict['start_date'] = exp_dict['start_date'].isoformat() if hasattr(exp_dict['start_date'], 'isoformat') else str(exp_dict['start_date'])
                        if exp_dict.get('end_date'):
                            exp_dict['end_date'] = exp_dict['end_date'].isoformat() if hasattr(exp_dict['end_date'], 'isoformat') else str(exp_dict['end_date'])
                        
                        experiences.append(exp_dict)
                    
                    return experiences
                    
        except Exception as e:
            logger.error(f"Get candidate all experiences error: {str(e)}")
            raise

    def get_candidate_applications(self, candidate_id: int) -> List[Dict[str, Any]]:
        """Get application history for a candidate using connection pool"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT 
                            apply_id,
                            company_name,
                            department_name,
                            job_title,
                            applied_at,
                            application_status
                        FROM candidate_applications
                        WHERE candidate_id = %s
                        ORDER BY applied_at DESC
                    """, (candidate_id,))
                    
                    results = cursor.fetchall()
                    logger.info(f"Found {len(results)} applications for candidate {candidate_id}")
                    
                    applications = []
                    for row in results:
                        app_dict = {
                            "apply_id": row["apply_id"],
                            "company_name": row["company_name"] or "Unknown Company",
                            "department_name": row["department_name"] or "Unknown Department", 
                            "job_title": row["job_title"] or "Unknown Position",
                            "applied_at": row["applied_at"],
                            "application_status": row["application_status"] or "Unknown Status"
                        }
                        applications.append(app_dict)
                    
                    return applications
                    
        except Exception as e:
            logger.error(f"Get candidate applications error: {str(e)}")
            raise
    # Add this method to your Database class in backend/database/db.py

    def get_batch_applications(self, candidate_ids: List[int]) -> Dict[int, List[Dict[str, Any]]]:
        """Get application history for multiple candidates using connection pool"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    placeholders = ','.join(['%s'] * len(candidate_ids))
                    
                    cursor.execute(f"""
                        SELECT 
                            candidate_id,
                            apply_id,
                            company_name,
                            department_name,
                            job_title,
                            applied_at,
                            application_status
                        FROM candidate_applications
                        WHERE candidate_id IN ({placeholders})
                        ORDER BY candidate_id, applied_at DESC
                    """, candidate_ids)
                    
                    results = cursor.fetchall()
                    logger.info(f"Found {len(results)} total applications for {len(candidate_ids)} candidates")
                    
                    # Group by candidate_id
                    applications_by_candidate = {}
                    for row in results:
                        candidate_id = row["candidate_id"]
                        if candidate_id not in applications_by_candidate:
                            applications_by_candidate[candidate_id] = []
                        
                        app_dict = {
                            "apply_id": row["apply_id"],
                            "company_name": row["company_name"] or "Unknown Company",
                            "department_name": row["department_name"] or "Unknown Department", 
                            "job_title": row["job_title"] or "Unknown Position",
                            "applied_at": row["applied_at"],
                            "application_status": row["application_status"] or "Unknown Status"
                        }
                        applications_by_candidate[candidate_id].append(app_dict)
                    
                    # Ensure all requested candidates have an entry (even if empty)
                    for candidate_id in candidate_ids:
                        if candidate_id not in applications_by_candidate:
                            applications_by_candidate[candidate_id] = []
                    
                    return applications_by_candidate
                    
        except Exception as e:
            logger.error(f"Get batch applications error: {str(e)}")
            raise
    def save_candidate(self, saved_search_id: int, candidate_id: int, note: str = "") -> int:
        """Save candidate - Updated to handle duplicates"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Check if already saved
                    cursor.execute("""
                        SELECT id FROM saved_candidates 
                        WHERE saved_search_id = %s AND candidate_id = %s
                    """, (saved_search_id, candidate_id))
                    
                    existing = cursor.fetchone()
                    if existing:
                        return existing['id']
                    
                    # Insert new save
                    cursor.execute("""
                        INSERT INTO saved_candidates (saved_search_id, candidate_id, note, created_at)
                        VALUES (%s, %s, %s, NOW())
                        RETURNING id
                    """, (saved_search_id, candidate_id, note))
                    return cursor.fetchone()["id"]
                    
        except Exception as e:
            logger.error(f"Save candidate error: {str(e)}")
            raise

    def unsave_candidate(self, saved_search_id: int, candidate_id: int):
        """Remove saved candidate"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        DELETE FROM saved_candidates 
                        WHERE saved_search_id = %s AND candidate_id = %s
                    """, (saved_search_id, candidate_id))
                    
        except Exception as e:
            logger.error(f"Unsave candidate error: {str(e)}")
            raise

    def get_saved_candidates(self, search_id: int) -> List[Dict[str, Any]]:
        """Get all saved candidates for a search with full candidate details"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT 
                            sc.id as saved_id,
                            sc.candidate_id,
                            sc.note,
                            sc.created_at as saved_at,
                            c.first_name,
                            c.last_name,
                            c.email,
                            c.phone,
                            c.profile_pic,
                            c.resume,
                            c.pst_score,
                            c.pst_date
                        FROM saved_candidates sc
                        JOIN candidates c ON sc.candidate_id = c.id
                        WHERE sc.saved_search_id = %s
                        ORDER BY sc.created_at DESC
                    """, (search_id,))
                    
                    return cursor.fetchall()
                    
        except Exception as e:
            logger.error(f"Get saved candidates error: {str(e)}")
            raise

    def get_saved_searches_with_candidate_count(self, user_id: int) -> List[Dict[str, Any]]:
        """Get saved searches but only those with saved candidates"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT 
                            ss.id, 
                            ss.search_name, 
                            ss.search_query, 
                            ss.created_at,
                            COUNT(sc.id) as saved_candidates_count
                        FROM saved_searches ss
                        LEFT JOIN saved_candidates sc ON ss.id = sc.saved_search_id
                        WHERE ss.user_id = %s
                        GROUP BY ss.id, ss.search_name, ss.search_query, ss.created_at
                        HAVING COUNT(sc.id) > 0
                        ORDER BY ss.created_at DESC
                    """, (user_id,))
                    return cursor.fetchall()
                    
        except Exception as e:
            logger.error(f"Get saved searches with count error: {str(e)}")
            raise

    def is_candidate_saved(self, search_id: int, candidate_id: int) -> bool:
        """Check if a candidate is saved for a specific search"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT 1 FROM saved_candidates 
                        WHERE saved_search_id = %s AND candidate_id = %s
                    """, (search_id, candidate_id))
                    
                    return cursor.fetchone() is not None
                    
        except Exception as e:
            logger.error(f"Check saved candidate error: {str(e)}")
            return False