// src/components/SearchInput/SearchSummary.js
import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import translations from '../../utils/translations';

const SearchSummary = ({ position, filters, activeFilters }) => {
  const { language } = useLanguage();
  const [expandedFilters, setExpandedFilters] = useState({});
  const [isSearchSummaryVisible, setIsSearchSummaryVisible] = useState(true);
  
  // Function to truncate text and handle expansion
  const truncateText = (text, maxLength = 200, filterId) => {
    if (!text || text.length <= maxLength) {
      return { text, needsTruncation: false };
    }
    
    const isExpanded = expandedFilters[filterId];
    if (isExpanded) {
      return { text, needsTruncation: true, isExpanded: true };
    }
    
    return { 
      text: text.substring(0, maxLength) + '...', 
      needsTruncation: true, 
      isExpanded: false 
    };
  };
  
  // Toggle expansion for a specific filter
  const toggleExpansion = (filterId) => {
    setExpandedFilters(prev => ({
      ...prev,
      [filterId]: !prev[filterId]
    }));
  };
  
  // Toggle search summary visibility
  const toggleSearchSummary = () => {
    setIsSearchSummaryVisible(prev => !prev);
  };
  
  // Create filter chips to display
  const getActiveFilters = () => {
    const activeFiltersList = [];
    
    if (position) {
      activeFiltersList.push({
        id: 'position',
        label: translations[language].position || 'Position',
        value: position
      });
    }
    
    if (activeFilters.skills && filters.skills) {
      activeFiltersList.push({
        id: 'skills',
        label: translations[language].skills || 'Skills',
        value: filters.skills
      });
    }
    
    if (activeFilters.experience && filters.experience) {
      activeFiltersList.push({
        id: 'experience',
        label: translations[language].experience || 'Experience',
        value: filters.experience
      });
    }
    
    if (activeFilters.industry && filters.industry) {
      activeFiltersList.push({
        id: 'industry',
        label: translations[language].industry || 'Industry',
        value: filters.industry
      });
    }
    
    if (activeFilters.education && filters.education) {
      activeFiltersList.push({
        id: 'education',
        label: translations[language].education || 'Education',
        value: filters.education
      });
    }

    if (activeFilters.jobDescription && filters.jobDescription) {
      activeFiltersList.push({
        id: 'jobDescription',
        label: translations[language].jobDescription || 'Job Description',
        value: filters.jobDescription
      });
    }
    
    return activeFiltersList;
  };
  
  const activeFiltersList = getActiveFilters();
  
  if (activeFiltersList.length === 0) {
    return null;
  }
  
  return (
    <div className="mb-4 animate-fadeIn">
      <div className="rounded-lg bg-gray-50 overflow-hidden">
        {/* Header with toggle button */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <span className="text-sm font-medium text-gray-700">
              {language === 'mn' ? 'Хайлтын шүүлтүүр' : 'Search Filters'}
            </span>
          </div>
          <button
            onClick={toggleSearchSummary}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors focus:outline-none"
            title={isSearchSummaryVisible ? (language === 'mn' ? 'Нуух' : 'Hide') : (language === 'mn' ? 'Харуулах' : 'Show')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transform transition-transform ${isSearchSummaryVisible ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6"></path>
            </svg>
          </button>
        </div>
        
        {/* Collapsible content */}
        {isSearchSummaryVisible && (
          <div className="p-3">
            <div className="flex items-start flex-wrap gap-2">
              {activeFiltersList.map((filter) => {
                const { text, needsTruncation, isExpanded } = truncateText(filter.value, 200, filter.id);
                
                return (
                  <div key={filter.id} className="inline-flex items-start rounded-lg bg-gray-100 px-3 py-1 text-sm max-w-full">
                    <span className="font-medium text-gray-900 flex-shrink-0">{filter.label}:</span>
                    <span className="ml-1 text-gray-700 break-words">
                      {text}
                      {needsTruncation && (
                        <button
                          onClick={() => toggleExpansion(filter.id)}
                          className="ml-1 px-2 py-0.5 text-xs text-gray-500 bg-gray-200 hover:bg-gray-300 rounded transition-colors focus:outline-none"
                          title={isExpanded ? 'Show less' : 'Show more'}
                        >
                          {isExpanded ? '−' : '...'}
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchSummary;