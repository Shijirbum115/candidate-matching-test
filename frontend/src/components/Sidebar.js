import React, { useState, useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import LanguageToggle from './LanguageToggle';
import translations from '../utils/translations';
import { getSavedSearchesWithCandidates } from '../services/api';
import '../styles/Sidebar.css';

const Sidebar = ({ onNewSearch, onLoadSavedSearch, refreshTrigger }) => {
  const { language } = useLanguage();
  const [savedSearches, setSavedSearches] = useState([]);
  const [isLoadingSearches, setIsLoadingSearches] = useState(false);
  
  // Load saved searches when component mounts or refresh is triggered
  useEffect(() => {
    const loadSavedSearches = async () => {
      setIsLoadingSearches(true);
      try {
        console.log('Loading saved searches with candidates...');
        const searches = await getSavedSearchesWithCandidates();
        console.log('Loaded searches:', searches);
        setSavedSearches(searches || []);
      } catch (error) {
        console.error('Failed to load saved searches:', error);
        setSavedSearches([]);
      } finally {
        setIsLoadingSearches(false);
      }
    };
    
    loadSavedSearches();
  }, [refreshTrigger]);
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  };
  
  return (
    <div className="sidebar">
      <div className="sidebar-header" onClick={onNewSearch}>
        <img
          src={`${process.env.PUBLIC_URL}/images/MCSG.png`}
          alt="Logo"
          className="w-24 h-auto sidebar-logo"
        />
      </div>
      
      <div className="sidebar-content">
        <div className="new-search-button" onClick={onNewSearch}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <span>{translations[language].newSearch}</span>
        </div>
        
        {/* Updated Saved Searches Section */}
        <div className="saved-searches">
        <h3 className="flex items-center">
          {language === 'mn' ? 'Хадгалсан хайлт' : 'Saved Searches'}
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </h3>
          
          {isLoadingSearches ? (
            <div className="loading-searches">
              <div className="search-loader">
                <div className="loader-spinner"></div>
              </div>
            </div>
          ) : savedSearches.length > 0 ? (
            <ul className="saved-search-list">
              {savedSearches.slice(0, 10).map((search) => (
                <li 
                  key={search.id} 
                  className="saved-search-item"
                  onClick={() => onLoadSavedSearch && onLoadSavedSearch(search)}
                >
                  <div 
                    className="saved-search-title"
                    title={search.search_name}
                  >
                    {search.search_name.length > 25 
                      ? search.search_name.substring(0, 25) + '...'
                      : search.search_name
                    }
                  </div>
                  <div className="saved-search-meta">
                    <span className="saved-search-date">
                      {formatDate(search.created_at)}
                    </span>
                    {/* Updated to show saved candidates count instead of total results */}
                    <span className="saved-search-count saved-candidates-count flex items-center gap-1">
                      {search.saved_candidates_count} {language === 'mn' ? 'хадгалсан' : 'saved'}
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="no-saved-searches">
              {language === 'mn' ? 'Хадгалсан хайлт байхгүй' : 'No saved searches'}
            </div>
          )}
        </div>
      </div>
      
      <div className="sidebar-footer">
        <div className="user-section">
          <div className="username">Username.T</div>
          <div className="footer-actions">
            <button className="settings-button" onClick={() => console.log('Settings clicked')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.79a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            <LanguageToggle />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;