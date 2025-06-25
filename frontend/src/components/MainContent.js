// src/components/MainContent.js - Fixed to preserve SearchInput state
import React, { useState } from 'react';
import { useLanguage } from './LanguageContext';
import translations from '../utils/translations';
import SearchInput from './SearchInput';
import CandidateList from './CandidateList';
import '../styles/output.css';

const MainContent = ({ 
  isSearching, 
  onSearch, 
  searchResults, 
  isLoading, 
  error, 
  onSelectCandidate, 
  selectedCandidateId,
  currentSearchQuery,
  // Saving props
  currentSearchId,
  savedCandidateIds,
  onToggleSaveCandidate,
  // SIMPLIFIED: Saved candidates props
  isViewingSavedCandidates = false,
  currentSavedSearch = null
}) => {
  const { language } = useLanguage();
  const [isSearchVisible, setIsSearchVisible] = useState(true);

  const toggleSearchVisibility = () => {
    setIsSearchVisible(prev => !prev);
  };

  const getHeaderContent = () => {
    if (isViewingSavedCandidates && currentSavedSearch) {
      return {
        title: currentSavedSearch.search_name || (language === 'mn' ? 'Хадгалсан ажил горилогчид' : 'Saved Candidates'),
        description: language === 'mn' 
          ? `"${currentSavedSearch.search_query?.position}" хайлтын хадгалсан ажил горилогчид`
          : `Saved candidates from "${currentSavedSearch.search_query?.position}" search`,
        isSpecialMode: true
      };
    }
    
    return {
      title: translations[language].welcomeMessage,
      description: translations[language].welcomeDescription,
      isSpecialMode: false
    };
  };

  const headerContent = getHeaderContent();
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden h-screen">
      {/* UPDATED: Header section with saved candidates support */}
      <div className={`${!isSearching ? 'flex flex-col items-center justify-center h-full px-4 py-12' : ''}`}>
        {!isSearching && (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">{headerContent.title}</h1>
            <p className="text-gray-600 max-w-lg mx-auto">{headerContent.description}</p>
            
            {/* SIMPLIFIED: Show saved search info */}
            {headerContent.isSpecialMode && currentSavedSearch && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 text-yellow-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span className="text-sm font-medium">
                    {language === 'mn' ? 'Хадгалсан хайлт' : 'Saved Search'}
                  </span>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  {language === 'mn' ? 'Хадгалсан огноо:' : 'Saved on:'} {new Date(currentSavedSearch.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* FIXED: SearchInput now always renders in the same tree position */}
        {(!isSearching || isSearchVisible) && (
          <div className={`${isSearching ? 'sticky top-0 bg-white z-10 px-4 py-3' : ''}`}>
            <SearchInput 
              onSearch={onSearch} 
              isSearching={isSearching} 
              isCompact={isSearching}
              currentSearchQuery={currentSearchQuery}
            />
          </div>
        )}
      </div>
      
      {/* Separator with Toggle Button - Only show when searching */}
      {isSearching && (
        <div className="relative flex items-center justify-center bg-white">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center">
            <button
              onClick={toggleSearchVisibility}
              className="bg-white px-2 py-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors focus:outline-none border border-gray-200"
              title={isSearchVisible ? (language === 'mn' ? 'Хайлтыг нуух' : 'Hide Search') : (language === 'mn' ? 'Хайлтыг харуулах' : 'Show Search')}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-4 w-4 transform transition-transform ${isSearchVisible ? 'rotate-180' : ''}`} 
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
      )}
      
      {/* Candidate List Section - Only show when searching */}
      {isSearching && (
        <div className="p-4 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
              <p className="mt-4 text-gray-600">{translations[language].searchingCandidates}</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          ) : searchResults ? (
            <CandidateList 
              candidates={searchResults} 
              onSelectCandidate={onSelectCandidate}
              selectedCandidateId={selectedCandidateId}
            />
          ) : null}
        </div>
      )}
    </div>
  );
};

export default MainContent;