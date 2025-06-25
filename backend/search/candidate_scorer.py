# backend/search/candidate_scorer.py - FIXED VERSION
from typing import List, Dict, Any, Optional
from datetime import date, datetime
from pydantic import BaseModel
import logging
from backend.utils.helpers import calculate_experience_multiplier

logger = logging.getLogger(__name__)

class ExperienceResponse(BaseModel):
    content: str
    structured_content_mn: str = ""
    company_name: str = ""
    position_title: str = ""
    years: float
    combined_score: float
    # Tier-specific fields
    match_tier: Optional[str] = None
    elasticsearch_score: Optional[float] = None
    tier_priority: Optional[float] = None

class CandidateResponse(BaseModel):
    candidate_id: int
    final_score: float
    experiences: List[ExperienceResponse]
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    registration_number: Optional[str] = None
    birthdate: Optional[date] = None
    profile_pic: Optional[str] = None
    resume: Optional[str] = None
    pst_score: Optional[int] = None
    pst_date: Optional[date] = None

    class Config:
        exclude_none = False

class OptimizedCandidateScorer:
    """FIXED: Prioritize exact matches properly"""
    
    def __init__(self, settings=None):
        self.keyword_weight = 0.8 if not settings else settings.keyword_weight
        self.semantic_weight = 0.2 if not settings else settings.semantic_weight

    def score_and_rank_candidates(self, results: List[Dict[str, Any]], 
                                 score_threshold: float, limit: int) -> List[CandidateResponse]:
        """
        FIXED: Properly prioritize EXACT matches over relevant matches
        """
        try:
            logger.info(f"🎯 FIXED Tier-aware scoring: {len(results)} results, threshold: {score_threshold}")
            
            # Check if we have tier-based results (from optimized ES)
            has_tiers = any(result.get('match_tier') for result in results[:5])
            
            if has_tiers:
                logger.info("Using FIXED TIER-BASED scoring mode")
                return self._score_tier_based_results_fixed(results, score_threshold, limit)
            else:
                # Fallback to original scoring for compatibility
                logger.info("Using LEGACY scoring mode")
                return self._score_legacy_results(results, score_threshold, limit)
                
        except Exception as e:
            logger.error(f"Scoring error: {str(e)}")
            raise

    def _score_tier_based_results_fixed(self, results: List[Dict[str, Any]], 
                                       score_threshold: float, limit: int) -> List[CandidateResponse]:
        """FIXED: Proper tier-based scoring that ACTUALLY prioritizes exact matches"""
        
        # 🔥 CRITICAL FIX: Sort by tier priority FIRST, then by score
        logger.info("🔧 FIXING: Sorting results by tier priority...")
        
        # Sort results by tier priority first (exact > relevant > similar)
        tier_priority_map = {
            'exact': 1000000,     # Highest priority  
            'relevant': 100000,   # Medium priority
            'similar': 10000,     # Lower priority
            'semantic_only': 5000, # Lowest priority
            'unknown': 1000       # Fallback
        }
        
        # Sort by tier priority first, then by elasticsearch score
        sorted_results = sorted(results, key=lambda x: (
            tier_priority_map.get(x.get('match_tier', 'unknown'), 1000),
            x.get('elasticsearch_score', 0)
        ), reverse=True)
        
        logger.info(f"🔧 After sorting: Top 5 tiers = {[r.get('match_tier', 'unknown') for r in sorted_results[:5]]}")
        
        # Aggregate experiences by candidate
        candidate_experiences = {}
        candidate_details = {}
        
        for row in sorted_results:
            candidate_id = row["candidate_id"]
            
            # Save candidate details (only once per candidate)
            if candidate_id not in candidate_details:
                candidate_details[candidate_id] = {
                    "first_name": row.get("first_name"),
                    "last_name": row.get("last_name"),
                    "email": row.get("email"),
                    "phone": row.get("phone"),
                    "gender": row.get("gender"),
                    "registration_number": row.get("registration_number"),
                    "birthdate": row.get("birthdate"),
                    "profile_pic": row.get("profile_pic"),
                    "resume": row.get("resume"),
                    "pst_score": row.get("pst_score"),
                    "pst_date": row.get("pst_date")
                }
            
            # Calculate experience years
            years = self._calculate_experience_years(row["start_date"], row["end_date"])
            
            # 🔥 FIXED: Calculate tier score with MASSIVE boost for exact matches
            tier_score = self._calculate_tier_score_fixed(row, years)
            
            # Aggregate experiences
            if candidate_id not in candidate_experiences:
                candidate_experiences[candidate_id] = []
            
            exp_data = {
                "content": row.get("structured_content_en", ""),
                "structured_content_mn": row.get("structured_content_mn", ""),
                "company_name": row.get("company_name", ""),
                "position_title": row.get("position_title", ""),
                "years": years,
                "combined_score": tier_score,
                "match_tier": row.get("match_tier", "unknown"),
                "elasticsearch_score": row.get("elasticsearch_score", 0),
                "tier_priority": tier_priority_map.get(row.get("match_tier", "unknown"), 1000)
            }
            
            candidate_experiences[candidate_id].append(exp_data)
        
        # Create candidate response objects with FIXED scoring
        candidates = []
        for candidate_id, experiences in candidate_experiences.items():
            # 🔥 FIXED: Calculate final score prioritizing exact matches
            final_score = self._calculate_candidate_final_score_fixed(experiences)
            
            # Filter experiences above threshold
            relevant_experiences = [
                exp for exp in experiences 
                if exp["combined_score"] > score_threshold
            ]
            
            if relevant_experiences:
                details = candidate_details.get(candidate_id, {})
                
                try:
                    candidate_response = CandidateResponse(
                        candidate_id=candidate_id,
                        final_score=final_score,
                        experiences=[ExperienceResponse(**exp) for exp in relevant_experiences],
                        **details
                    )
                    candidates.append(candidate_response)
                except Exception as e:
                    logger.error(f"Error creating response for candidate {candidate_id}: {str(e)}")
                    continue
        
        # 🔥 CRITICAL: Sort candidates by final score (which now prioritizes exact matches)
        candidates.sort(key=lambda x: x.final_score, reverse=True)
        result_candidates = candidates[:limit]
        
        if result_candidates:
            self._log_fixed_tier_scoring_results(result_candidates)
        
        return result_candidates

    def _calculate_tier_score_fixed(self, row: Dict[str, Any], years: float) -> float:
        """FIXED: Calculate score with MASSIVE boost for exact matches"""
        tier = row.get('match_tier', 'similar')
        elasticsearch_score = row.get('elasticsearch_score', 0)
        
        # Apply experience multiplier
        experience_multiplier = calculate_experience_multiplier(years)
        
        # 🔥 FIXED: MASSIVE tier-specific scoring to ensure exact matches always win
        if tier == 'exact':
            # Exact matches get HUGE base score + ES score boost
            base_score = 100.0 + (elasticsearch_score / 100.0)  # 100+ base score
            final_score = base_score * (1.0 + experience_multiplier * 0.3)
            
        elif tier == 'relevant':
            # Relevant matches get medium score
            base_score = 10.0 + (elasticsearch_score / 1000.0)   # 10+ base score  
            final_score = base_score * (1.0 + experience_multiplier * 0.2)
            
        else:
            # Similar/other matches get low score
            base_score = 1.0 + (elasticsearch_score / 10000.0)   # 1+ base score
            final_score = base_score * (1.0 + experience_multiplier * 0.1)
        
        logger.debug(f"Score calculation: tier={tier}, es_score={elasticsearch_score}, years={years:.1f}, final={final_score:.2f}")
        
        return final_score

    def _calculate_candidate_final_score_fixed(self, experiences: List[Dict]) -> float:
        """FIXED: Calculate final candidate score prioritizing exact matches"""
        if not experiences:
            return 0.0
        
        # 🔥 FIXED: Find the BEST experience (highest score) for this candidate
        best_experience = max(experiences, key=lambda x: x['combined_score'])
        best_score = best_experience['combined_score']
        
        # If the best experience is an exact match, heavily boost the candidate
        if best_experience.get('match_tier') == 'exact':
            # Exact match candidates get massive boost
            boost = 1000.0 + best_score
        else:
            # Non-exact candidates get normal scoring
            boost = best_score
        
        # Add smaller contributions from other experiences
        additional_score = sum(exp['combined_score'] * 0.1 for exp in experiences[1:3])  # Top 3 only
        
        final_score = boost + additional_score
        
        logger.debug(f"Candidate final score: best_tier={best_experience.get('match_tier')}, best_score={best_score:.2f}, final={final_score:.2f}")
        
        return final_score

    def _calculate_experience_years(self, start_date, end_date) -> float:
        """Calculate years of experience from dates"""
        try:
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date.replace('Z', '')).date()
            elif isinstance(start_date, datetime):
                start_date = start_date.date()
            
            if end_date:
                if isinstance(end_date, str):
                    end_date = datetime.fromisoformat(end_date.replace('Z', '')).date()
                elif isinstance(end_date, datetime):
                    end_date = end_date.date()
            else:
                end_date = date.today()
            
            if start_date:
                years = (end_date - start_date).days / 365.25
                return max(years, 0.0)
            
            return 0.0
        except:
            return 0.0

    def _log_fixed_tier_scoring_results(self, candidates: List[CandidateResponse]):
        """Log FIXED tier-aware scoring results"""
        logger.info(f"✅ FIXED Tier-aware scoring: {len(candidates)} candidates")
        logger.info(f"📊 Score range: {candidates[0].final_score:.3f} - {candidates[-1].final_score:.3f}")
        
        # Count by tier
        tier_counts = {}
        for candidate in candidates[:10]:
            top_exp = max(candidate.experiences, key=lambda x: x.combined_score)
            tier = getattr(top_exp, 'match_tier', 'unknown')
            tier_counts[tier] = tier_counts.get(tier, 0) + 1
        
        logger.info(f"🏆 FIXED Top 10 by tier: {tier_counts}")
        
        # Show top 5 with details
        for i, candidate in enumerate(candidates[:5]):
            top_exp = max(candidate.experiences, key=lambda x: x.combined_score)
            tier = getattr(top_exp, 'match_tier', 'unknown')
            es_score = getattr(top_exp, 'elasticsearch_score', 0)
            
            logger.info(f"  #{i+1}: '{top_exp.position_title}' ({tier}) - "
                       f"Final: {candidate.final_score:.3f}, ES: {es_score:.0f}")

    def _score_legacy_results(self, results: List[Dict[str, Any]], 
                             score_threshold: float, limit: int) -> List[CandidateResponse]:
        """LEGACY: Original scoring method for backward compatibility"""
        
        # Aggregate experiences by candidate
        candidate_experiences = {}
        candidate_details = {}
        
        for row in results:
            candidate_id = row["candidate_id"]
            
            # Save candidate details (only once per candidate)
            if candidate_id not in candidate_details:
                candidate_details[candidate_id] = {
                    "first_name": row.get("first_name"),
                    "last_name": row.get("last_name"),
                    "email": row.get("email"),
                    "phone": row.get("phone"),
                    "gender": row.get("gender"),
                    "registration_number": row.get("registration_number"),
                    "birthdate": row.get("birthdate"),
                    "profile_pic": row.get("profile_pic"),
                    "resume": row.get("resume"),
                    "pst_score": row.get("pst_score"),
                    "pst_date": row.get("pst_date")
                }
            
            # Aggregate experiences
            if candidate_id not in candidate_experiences:
                candidate_experiences[candidate_id] = []
            
            years = self._calculate_experience_years(row["start_date"], row["end_date"])
            
            # Use existing scoring logic
            semantic_score = row.get("norm_cos_sim", 0)
            
            if "elasticsearch_score" in row:
                # Elasticsearch scoring
                es_score = row["elasticsearch_score"]
                normalized_keyword_score = min(es_score / 10000.0, 1.0)
                combined_score = (
                    self.keyword_weight * normalized_keyword_score +
                    self.semantic_weight * semantic_score
                )
            else:
                # Original scoring
                keyword_score = max(row.get("fts_vector_en_rank", 0), row.get("fts_vector_mn_rank", 0))
                keyword_score = min(max(keyword_score, 0), 1)
                combined_score = self.keyword_weight * keyword_score + self.semantic_weight * semantic_score
            
            exp_data = {
                "content": row.get("structured_content_en", ""),
                "structured_content_mn": row.get("structured_content_mn", ""),
                "company_name": row.get("company_name", ""),
                "position_title": row.get("position_title", ""),
                "years": years,
                "combined_score": combined_score
            }
            
            candidate_experiences[candidate_id].append(exp_data)
        
        # Create candidate response objects
        candidates = []
        for candidate_id, experiences in candidate_experiences.items():
            final_score = 0.0
            relevant_experiences = []
            
            for exp in experiences:
                if exp["combined_score"] > score_threshold:
                    multiplier = calculate_experience_multiplier(exp["years"])
                    final_score += multiplier * exp["combined_score"]
                    relevant_experiences.append(ExperienceResponse(**exp))
            
            if relevant_experiences:
                details = candidate_details.get(candidate_id, {})
                
                try:
                    candidate_response = CandidateResponse(
                        candidate_id=candidate_id,
                        final_score=final_score,
                        experiences=relevant_experiences,
                        **details
                    )
                    candidates.append(candidate_response)
                except Exception as e:
                    logger.error(f"Error creating response for candidate {candidate_id}: {str(e)}")
                    continue
        
        # Sort and limit results
        candidates.sort(key=lambda x: x.final_score, reverse=True)
        result_candidates = candidates[:limit]
        
        if result_candidates:
            logger.info(f"Legacy scoring: {len(result_candidates)} candidates, "
                      f"score range: {result_candidates[0].final_score:.2f} - {result_candidates[-1].final_score:.2f}")
        
        return result_candidates


# Keep original class for backward compatibility
class CandidateScorer(OptimizedCandidateScorer):
    """Backward compatibility wrapper"""
    pass