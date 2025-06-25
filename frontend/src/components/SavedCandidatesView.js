import React, { useState, useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import translations from '../utils/translations';
import { getSavedCandidates, getProfileImageUrl } from '../services/api';
import LastApplicationInfo from './LastApplicationInfo';
import StarButton from './StarButton';
import '../styles/SavedCandidatesView.css';

const SavedCandidatesView = ({ 
  savedSearch, 
  onSelectCandidate, 
  selectedCandidateId,
  onToggleSaveCandidate 
}) => {
  const { language } = useLanguage();
  const [savedCandidates, setSavedCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unsavingCandidates, setUnsavingCandidates] = useState(new Set());

  // Load saved candidates when component mounts or search changes
  useEffect(() => {
    if (savedSearch?.id) {
      loadSavedCandidates();
    }
  }, [savedSearch?.id]);

  const loadSavedCandidates = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const candidates = await getSavedCandidates(savedSearch.id);
      setSavedCandidates(candidates);
    } catch (err) {
      console.error('Failed to load saved candidates:', err);
      setError('Failed to load saved candidates');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle unsaving candidate
  const handleUnsaveCandidate = async (candidateId) => {
    setUnsavingCandidates(prev => new Set([...prev, candidateId]));
    
    try {
      await onToggleSaveCandidate(candidateId);
      // Remove from local state
      setSavedCandidates(prev => 
        prev.filter(candidate => candidate.candidate_id !== candidateId)
      );
    } catch (error) {
      console.error('Failed to unsave candidate:', error);
    } finally {
      setUnsavingCandidates(prev => {
        const newSet = new Set(prev);
        newSet.delete(candidateId);
        return newSet;
      });
    }
  };

  const getDisplayName = (candidate) => {
    const firstName = candidate.first_name || '';
    const lastName = candidate.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || `Candidate #${candidate.candidate_id}`;
  };

  const formatSavedDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'mn' ? 'mn-MN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="saved-candidates-view">
        <div className="loading-container">
          <div className="loader-spinner"></div>
          <p>{language === 'mn' ? 'Хадгалсан ажил горилогчдыг ачааллаж байна...' : 'Loading saved candidates...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="saved-candidates-view">
        <div className="error-container">
          <p>{error}</p>
          <button onClick={loadSavedCandidates} className="retry-button">
            {language === 'mn' ? 'Дахин оролдох' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-candidates-view">
      {/* Header */}
      <div className="saved-header">
        <div className="saved-search-info">
          <h1 className="saved-search-title">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {savedSearch?.search_name || (language === 'mn' ? 'Хадгалсан ажил горилогчид' : 'Saved Candidates')}
          </h1>
          
          {savedSearch?.search_query && (
            <div className="search-query-info">
              <p className="search-query-text">
                <strong>{language === 'mn' ? 'Хайлтын үг:' : 'Search Query:'}</strong> 
                {savedSearch.search_query.position}
              </p>
              <p className="search-date">
                <strong>{language === 'mn' ? 'Хайсан огноо:' : 'Searched on:'}</strong> 
                {formatSavedDate(savedSearch.created_at)}
              </p>
            </div>
          )}
        </div>
        
        <div className="saved-stats">
          <div className="stat-item">
            <span className="stat-number">{savedCandidates.length}</span>
            <span className="stat-label">
              {language === 'mn' ? 'Хадгалсан' : 'Saved'}
            </span>
          </div>
        </div>
      </div>

      {/* Candidates List */}
      {savedCandidates.length === 0 ? (
        <div className="no-saved-candidates">
          <div className="no-saved-icon">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h3>{language === 'mn' ? 'Хадгалсан ажил горилогч байхгүй' : 'No saved candidates'}</h3>
          <p>{language === 'mn' ? 'Энэ хайлтаар хадгалсан ажил горилогч байхгүй байна.' : 'No candidates have been saved for this search.'}</p>
        </div>
      ) : (
        <div className="saved-candidates-list">
          {savedCandidates.map((savedCandidate) => {
            const candidateId = savedCandidate.candidate_id;
            const isUnsaving = unsavingCandidates.has(candidateId);

            return (
              <div 
                key={candidateId}
                className={`saved-candidate-card ${candidateId === selectedCandidateId ? 'selected' : ''}`}
                onClick={() => onSelectCandidate(savedCandidate)}
              >
                {/* Profile Picture */}
                <div className="candidate-avatar">
                  <img 
                    src={getProfileImageUrl(candidateId, savedCandidate.profile_pic)}
                    alt="Profile" 
                    className="avatar-image" 
                    onError={(e) => {
                      e.target.src = `${process.env.PUBLIC_URL}/images/profile_example_pic.png`;
                    }}
                    loading="lazy"
                  />
                </div>
                
                <div className="candidate-info">
                  {/* Row 1: Name + Star + Score */}
                  <div className="info-row primary-row">
                    <h3 className="candidate-name">{getDisplayName(savedCandidate)}</h3>
                    <div className="badges-container">
                      {/* Star button (always starred, can unsave) */}
                      <StarButton
                        isStarred={true}
                        isLoading={isUnsaving}
                        onToggle={() => handleUnsaveCandidate(candidateId)}
                        size="medium"
                        showTooltip={true}
                      />
                      {savedCandidate.pst_score && (
                        <div className="badge pst-badge">
                          PST: {savedCandidate.pst_score}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Row 2: Contact Info */}
                  <div className="info-row contact-row">
                    <div className="contact-info">
                      {savedCandidate.email && (
                        <span className="contact-item">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22 6 12 13 2 6"></polyline>
                          </svg>
                          {savedCandidate.email}
                        </span>
                      )}
                      {savedCandidate.phone && (
                        <span className="contact-item">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                          </svg>
                          {savedCandidate.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Row 3: Saved date and note */}
                  <div className="info-row saved-info-row">
                    <div className="saved-info">
                      <span className="saved-date">
                        {language === 'mn' ? 'Хадгалсан:' : 'Saved:'} {formatSavedDate(savedCandidate.saved_at)}
                      </span>
                      {savedCandidate.note && (
                        <span className="saved-note">
                          {language === 'mn' ? 'Тэмдэглэл:' : 'Note:'} {savedCandidate.note}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Row 4: Last Application */}
                  <div className="info-row application-row">
                    <LastApplicationInfo candidate={savedCandidate} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedCandidatesView;