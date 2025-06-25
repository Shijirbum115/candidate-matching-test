// frontend/src/components/LastApplicationInfo.js
import React, { useState, useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import { getCandidateApplications } from '../services/api';

// Create a global cache and batch system
const pendingRequests = new Map();
const batchTimeout = 50; // 50ms batch window

const LastApplicationInfo = ({ candidate }) => {
  const { language } = useLanguage();
  const [lastApplication, setLastApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (candidate?.candidate_id) {
      loadLastApplication();
    }
  }, [candidate?.candidate_id]);

  const loadLastApplication = async () => {
    if (!candidate?.candidate_id) return;
    
    setIsLoading(true);
    try {
      const applications = await getCandidateApplications(candidate.candidate_id);
      // Get the most recent application (first one since they're ordered by applied_at DESC)
      if (applications && applications.length > 0) {
        setLastApplication(applications[0]);
      } else {
        setLastApplication(null);
      }
    } catch (err) {
      console.error('Failed to load last application:', err);
      setLastApplication(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      };
      return date.toLocaleDateString('en-US', options);
    } catch (e) {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="last-application-container loading">
        <div className="loading-content">
          <div className="loading-dot"></div>
          <span className="loading-text">
            {language === 'mn' ? 'Ачааллаж байна...' : 'Loading...'}
          </span>
        </div>
      </div>
    );
  }

  if (!lastApplication) {
    return (
      <div className="last-application-container empty">
        <span className="empty-text">
          {language === 'mn' ? 'Өргөдөл байхгүй' : 'No applications'}
        </span>
      </div>
    );
  }

  return (
    <div className="last-application-container">
      <span className="application-label">
        {language === 'mn' ? 'Сүүлийн өргөдөл' : 'Most recent application'}
      </span>
      <span className="application-title">
        {lastApplication.job_title || (language === 'mn' ? 'Тодорхойгүй албан тушаал' : 'Unknown position')}
      </span>
      <span className="application-date-list">
        {formatDate(lastApplication.applied_at)}
      </span>
    </div>
  );
};

export default LastApplicationInfo;