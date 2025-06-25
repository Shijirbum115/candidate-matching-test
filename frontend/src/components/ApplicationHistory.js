// frontend/src/components/ApplicationHistory.js
import React, { useState, useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import translations from '../utils/translations';
import { getCandidateApplications } from '../services/api';
import '../styles/ApplicationHistory.css';

const ApplicationHistory = ({ candidate }) => {
  const { language } = useLanguage();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (candidate?.candidate_id && isExpanded) {
      loadApplicationHistory();
    }
  }, [candidate?.candidate_id, isExpanded]);

  const loadApplicationHistory = async () => {
    if (!candidate?.candidate_id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const applicationData = await getCandidateApplications(candidate.candidate_id);
      setApplications(applicationData);
    } catch (err) {
      console.error('Failed to load application history:', err);
      setError('Failed to load application history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return translations[language].notAvailable;
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(language === 'mn' ? 'mn-MN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return translations[language].notAvailable;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return translations[language].notAvailable;
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString(language === 'mn' ? 'mn-MN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return translations[language].notAvailable;
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const displayValue = (value, fallback = null) => {
    const fallbackText = fallback || translations[language].notAvailable;
    return value && value.trim() !== '' ? value : fallbackText;
  };

  return (
    <div className="application-history-section">
      {/* Header with toggle */}
      <div className="application-history-header" onClick={toggleExpanded}>
        <h3>{translations[language].applicationHistory}</h3>
        <div className="application-history-controls">
          {applications.length > 0 && (
            <span className="application-count">
              {applications.length} {translations[language].applications}
            </span>
          )}
          <button className="toggle-button" type="button">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`toggle-icon ${isExpanded ? 'expanded' : ''}`} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="application-history-content">
          {isLoading ? (
            <div className="loading-applications">
              <div className="application-loader">
                <div className="loader-spinner"></div>
              </div>
              <div>{translations[language].loadingApplications}</div>
            </div>
          ) : error ? (
            <div className="application-error">
              <p>{error}</p>
              <button onClick={loadApplicationHistory} className="retry-button">
                {language === 'mn' ? 'Дахин оролдох' : 'Retry'}
              </button>
            </div>
          ) : applications && applications.length > 0 ? (
            <div className="application-list">
              {applications.map((application, index) => (
                <div key={application.apply_id || index} className="application-item">
                  <div className="application-header">
                    <div className="application-date">
                      {formatDate(application.applied_at)}
                    </div>
                    <div className="application-status">
                      {displayValue(application.application_status)}
                    </div>
                  </div>
                  
                  <div className="application-details">
                    <div className="application-detail-row">
                      <div className="detail-label">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                        {translations[language].company}:
                      </div>
                      <div className="detail-value">
                        {displayValue(application.company_name, translations[language].unknownCompany)}
                      </div>
                    </div>

                    <div className="application-detail-row">
                      <div className="detail-label">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        {translations[language].department}:
                      </div>
                      <div className="detail-value">
                        {displayValue(application.department_name, translations[language].unknownDepartment)}
                      </div>
                    </div>

                    <div className="application-detail-row">
                      <div className="detail-label">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        {translations[language].position}:
                      </div>
                      <div className="detail-value">
                        {displayValue(application.job_title, translations[language].unknownPosition)}
                      </div>
                    </div>

                    <div className="application-detail-row">
                      <div className="detail-label">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        {translations[language].appliedOn}:
                      </div>
                      <div className="detail-value">
                        {formatDateTime(application.applied_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-applications">
              <div className="no-applications-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <p>{translations[language].noApplicationHistory}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApplicationHistory;