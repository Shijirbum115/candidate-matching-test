// src/components/CandidateList.js - FIXED to show actual latest job
import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage } from './LanguageContext';
import translations from '../utils/translations';
import { getProfileImageUrl, prefetchProfileImage, getCandidateAllExperiences } from '../services/api';
import LastApplicationInfo from './LastApplicationInfo';
import StarButton from './StarButton';
import '../styles/CandidateList.css';

const CandidateList = ({ 
  candidates, 
  onSelectCandidate, 
  selectedCandidateId,
  currentSearchId,
  savedCandidateIds = new Set(),
  onToggleSaveCandidate
}) => {
  const { language } = useLanguage();
  const [showPstFailed, setShowPstFailed] = useState(false);
  const [latestJobs, setLatestJobs] = useState({}); // Store latest job info for each candidate
  const [loadingJobs, setLoadingJobs] = useState(new Set()); // Track which candidates are loading
  const [savingCandidates, setSavingCandidates] = useState(new Set());

  // Filter candidates based on PST status
  const filteredCandidates = candidates.filter(candidate => {
    const pstScore = candidate.pst_score;
    const hasPstFailed = pstScore !== null && pstScore !== undefined && pstScore < 20;
    
    if (showPstFailed) {
      // Show only candidates with good match scores BUT PST failed
      return hasPstFailed;
    } else {
      // Default: exclude PST failed candidates (show PST passed + null PST)
      return !hasPstFailed;
    }
  });
  
  // Preload all candidate profile images when the list changes
  useEffect(() => {
    if (!filteredCandidates || filteredCandidates.length === 0) return;
    
    // Preload images more aggressively
    filteredCandidates.forEach((candidate, index) => {
      if (candidate.profile_pic) {
        // Prioritize first few candidates for immediate loading
        if (index < 5) {
          prefetchProfileImage(candidate.candidate_id, candidate.profile_pic);
        } else {
          // Delay loading for others to prevent overwhelming the network
          setTimeout(() => {
            prefetchProfileImage(candidate.candidate_id, candidate.profile_pic);
          }, index * 100);
        }
      }
    });
  }, [filteredCandidates]);

  // NEW: Load latest job info for visible candidates
  useEffect(() => {
    const loadLatestJobs = async () => {
      // Load jobs for first 10-15 candidates (visible ones)
      const visibleCandidates = filteredCandidates.slice(0, 15);
      
      for (const candidate of visibleCandidates) {
        const candidateId = candidate.candidate_id;
        
        // Skip if already loaded or currently loading
        if (latestJobs[candidateId] || loadingJobs.has(candidateId)) {
          continue;
        }
        
        // Mark as loading
        setLoadingJobs(prev => new Set([...prev, candidateId]));
        
        try {
          const allExperiences = await getCandidateAllExperiences(candidateId);
          
          if (allExperiences && allExperiences.length > 0) {
            // Sort by start_date to get the most recent job
            const sortedExperiences = allExperiences.sort((a, b) => {
              const dateA = new Date(a.start_date || '1900-01-01');
              const dateB = new Date(b.start_date || '1900-01-01');
              return dateB - dateA; // Most recent first
            });
            
            const latestJob = sortedExperiences[0];
            
            setLatestJobs(prev => ({
              ...prev,
              [candidateId]: {
                company: latestJob.company_name || (language === 'mn' ? 'Тодорхойгүй' : 'Unknown'),
                position: latestJob.position_title || (language === 'mn' ? 'Тодорхойгүй' : 'Unknown'),
                isLatest: true
              }
            }));
          } else {
            // No experience data available
            setLatestJobs(prev => ({
              ...prev,
              [candidateId]: {
                company: language === 'mn' ? 'Мэдээлэл байхгүй' : 'No data',
                position: language === 'mn' ? 'Мэдээлэл байхгүй' : 'No data',
                isLatest: false
              }
            }));
          }
        } catch (error) {
          console.error(`Failed to load latest job for candidate ${candidateId}:`, error);
          // Fallback to matched experience
          setLatestJobs(prev => ({
            ...prev,
            [candidateId]: getCurrentJobInfoFromMatched(candidate.experiences)
          }));
        } finally {
          // Remove from loading set
          setLoadingJobs(prev => {
            const newSet = new Set(prev);
            newSet.delete(candidateId);
            return newSet;
          });
        }
      }
    };
    
    if (filteredCandidates.length > 0) {
      loadLatestJobs();
    }
  }, [filteredCandidates, language]);
  
  const handleStarClick = async (candidateId) => {
    if (!currentSearchId || !onToggleSaveCandidate) {
      console.warn('Cannot save candidate: no search context');
      return;
    }

    setSavingCandidates(prev => new Set([...prev, candidateId]));
    
    try {
      await onToggleSaveCandidate(candidateId);
    } finally {
      setSavingCandidates(prev => {
        const newSet = new Set(prev);
        newSet.delete(candidateId);
        return newSet;
      });
    }
  };

  // Optimized handler for candidate selection with memoization
  const handleCandidateClick = useCallback((candidate) => {
    if (candidate.candidate_id !== selectedCandidateId) {
      onSelectCandidate(candidate);
    }
  }, [onSelectCandidate, selectedCandidateId]);
  
  // Toggle PST failed filter
  const handleTogglePstFailed = () => {
    setShowPstFailed(prev => !prev);
  };
  
  // Helper function to render PST score with status and color
  const renderPstScore = (candidate) => {
    const pstScore = candidate.pst_score;
    const pstDate = candidate.pst_date;
    
    if (!pstScore) return null;
    
    const yearsAgo = pstDate ? calculateYearsAgo(pstDate) : null;
    let status = '';
    let colorClass = '';
    
    if (pstScore < 20) {
      if (yearsAgo !== null && yearsAgo <= 5) {
        status = language === 'mn' ? 'Тэнцээгүй' : 'Failed';
        colorClass = 'pst-failed';
      } else {
        status = language === 'mn' ? 'Эрх нээгдсэн' : 'Eligible';
        colorClass = 'pst-eligible';
      }
    } else if (pstScore >= 20 && pstScore < 25) {
      status = language === 'mn' ? 'Тэнцсэн' : 'Passed';
      colorClass = 'pst-passed';
    } else if (pstScore >= 25) {
      status = language === 'mn' ? 'Тэнцсэн+' : 'Passed+';
      colorClass = 'pst-excellent';
    }
    
    return (
      <div className={`badge pst-badge ${colorClass}`}>
        PST: {status}
      </div>
    );
  };

  const calculateYearsAgo = (dateString) => {
    if (!dateString) return null;
    const pstDate = new Date(dateString);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate - pstDate);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
  };

  const getDisplayName = (candidate) => {
    const firstName = candidate.first_name || '';
    const lastName = candidate.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || `Candidate #${candidate.candidate_id}`;
  };

  const getTotalExperienceYears = (experiences) => {
    if (!experiences || experiences.length === 0) return 0;
    const totalYears = experiences.reduce((sum, exp) => sum + (exp.years || 0), 0);
    return Math.round(totalYears * 10) / 10;
  };

  // UPDATED: Get current job info - now checks latest jobs first, then falls back to matched
  const getCurrentJobInfo = (candidate) => {
    const candidateId = candidate.candidate_id;
    
    // Check if we have loaded the latest job info
    if (latestJobs[candidateId]) {
      return latestJobs[candidateId];
    }
    
    // Check if currently loading
    if (loadingJobs.has(candidateId)) {
      return {
        company: language === 'mn' ? 'Ачааллаж байна...' : 'Loading...',
        position: language === 'mn' ? 'Ачааллаж байна...' : 'Loading...',
        isLatest: false
      };
    }
    
    // Fallback to matched experiences
    return getCurrentJobInfoFromMatched(candidate.experiences);
  };

  // HELPER: Get job info from matched experiences (fallback)
  const getCurrentJobInfoFromMatched = (experiences) => {
    if (!experiences || experiences.length === 0) {
      return {
        company: language === 'mn' ? 'Мэдээлэл байхгүй' : 'No data',
        position: language === 'mn' ? 'Мэдээлэл байхгүй' : 'No data',
        isLatest: false
      };
    }

    const currentJob = experiences[0]; // First matched experience
    return {
      company: currentJob.company_name || (language === 'mn' ? 'Тодорхойгүй' : 'Unknown'),
      position: currentJob.position_title || (language === 'mn' ? 'Тодорхойгүй' : 'Unknown'),
      isLatest: false // Indicate this is from matched, not latest
    };
  };

  const getEducationInfo = (candidate) => {
    const education = candidate.education;
    
    if (!education || education.length === 0) {
      return {
        field: language === 'mn' ? 'Мэдээлэл байхгүй' : 'No data available',
        university: ''
      };
    }

    const latestEducation = education[0];
    const field = latestEducation.field_of_study || latestEducation.degree_name || (language === 'mn' ? 'Тодорхойгүй салбар' : 'Unknown field');
    const university = latestEducation.institution || '';
    
    return { field, university };
  };
  
  if (!candidates || candidates.length === 0) {
    return (
      <div className="no-results">
        <p>{translations[language].noResults}</p>
      </div>
    );
  }

  return (
    <div className="candidate-list">
      <div className="candidate-list-header">
        <h2>
          {translations[language].matchingCandidates} ({filteredCandidates.length})
        </h2>
        <div className="header-actions">
          {/* NEW: Show saved count if any */}
          {savedCandidateIds.size > 0 && (
            <div className="saved-count">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {savedCandidateIds.size} {language === 'mn' ? 'хадгалсан' : 'saved'}
            </div>
          )}
          
          <button 
            onClick={handleTogglePstFailed}
            className={`pst-filter-button ${showPstFailed ? 'active' : ''}`}
          >
            {showPstFailed 
              ? (language === 'mn' ? 'PST тэнцээгүйг нуух' : 'Hide PST Failed')
              : (language === 'mn' ? 'PST тэнцээгүйг харуулах' : 'Show PST Failed')
            }
          </button>
        </div>
      </div>

      <div className="candidates">
        {filteredCandidates.map((candidate) => {
          const totalExperience = getTotalExperienceYears(candidate.experiences);
          const currentJob = getCurrentJobInfo(candidate);
          const education = getEducationInfo(candidate);
          const candidateId = candidate.candidate_id;
          const isSaved = savedCandidateIds.has(candidateId);
          const isSaving = savingCandidates.has(candidateId);

          return (
            <div 
              key={candidateId}
              className={`candidate-card-new ${candidateId === selectedCandidateId ? 'selected' : ''}`}
              onClick={() => handleCandidateClick(candidate)}
            >
              {/* Profile Picture */}
              <div className="candidate-avatar">
                <img 
                  src={getProfileImageUrl(candidateId, candidate.profile_pic)}
                  alt="Profile" 
                  className="avatar-image" 
                  onError={(e) => {
                    e.target.src = `${process.env.PUBLIC_URL}/images/profile_example_pic.png`;
                  }}
                  loading="lazy"
                />
              </div>
              
              <div className="candidate-info">
                {/* Row 1: Name + Star + PST + Score */}
                <div className="info-row primary-row">
                  <h3 className="candidate-name">{getDisplayName(candidate)}</h3>
                  <div className="badges-container">
                    {/* NEW: Star button */}
                    {currentSearchId && (
                      <StarButton
                        isStarred={isSaved}
                        isLoading={isSaving}
                        onToggle={() => handleStarClick(candidateId)}
                        size="medium"
                      />
                    )}
                    {renderPstScore(candidate)}
                    <div className="badge score-badge">
                      {candidate.final_score.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                {/* Row 2: Last Application */}
                <div className="info-row application-row">
                  <LastApplicationInfo candidate={candidate} />
                </div>
                
                {/* Row 3: Total Experience + Latest Employer */}
                <div className="info-row experience-row">
                  <div className="info-item">
                    <div className="info-with-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" className="info-icon experience-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span className="info-label">
                        {language === 'mn' ? 'Нийт туршлага:' : 'Total Experience:'}
                      </span>
                    </div>
                    <span className="info-value">
                      {totalExperience} {language === 'mn' ? 'жил' : 'years'}
                    </span>
                  </div>
                  <div className="info-item">
                    <div className="info-with-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" className="info-icon company-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                      </svg>
                      <span className="info-label">
                        {/* UPDATED: Show "Latest" vs "Matched" based on data source */}
                        {currentJob.isLatest 
                          ? (language === 'mn' ? 'Сүүлийн компани:' : 'Latest employer:')
                          : (language === 'mn' ? 'Холбогдох компани:' : 'Matched employer:')
                        }
                      </span>
                    </div>
                    <span className="info-value">{currentJob.company}</span>
                  </div>
                </div>
                
                {/* Row 4: Latest Role + Education */}
                <div className="info-row details-row">
                  <div className="info-item">
                    <div className="info-with-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" className="info-icon position-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <span className="info-label">
                        {/* UPDATED: Show "Latest" vs "Matched" based on data source */}
                        {currentJob.isLatest 
                          ? (language === 'mn' ? 'Сүүлийн албан тушаал:' : 'Latest position:')
                          : (language === 'mn' ? 'Холбогдох албан тушаал:' : 'Matched position:')
                        }
                      </span>
                    </div>
                    <span className="info-value">{currentJob.position}</span>
                  </div>
                  <div className="info-item">
                    <div className="info-with-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" className="info-icon education-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                        <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                      </svg>
                      <span className="info-label">
                        {language === 'mn' ? 'Боловсрол:' : 'Education:'}
                      </span>
                    </div>
                    <span className="info-value">
                      {education.field}
                      {education.university && (
                        <span className="university-suffix"> - {education.university}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CandidateList;