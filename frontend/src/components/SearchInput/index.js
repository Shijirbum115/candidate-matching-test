// frontend/src/components/SearchInput/index.js - Corrected with Elasticsearch support
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import translations from '../../utils/translations';
import FilterBar from './FilterBar';
import SearchSummary from './SearchSummary';
import config from '../../configs/config';

const SearchInput = ({ onSearch, isSearching, isCompact = false, currentSearchQuery }) => {
  const { language } = useLanguage();
  const [position, setPosition] = useState('');
  const [description, setDescription] = useState('');
  
  // Use config values
  const [limit, setLimit] = useState(config.search.candidateLimit);
  const [scoreThreshold, setScoreThreshold] = useState(config.search.scoreThreshold);
  
  // States for each filter
  const [activeFilters, setActiveFilters] = useState({
    jobDescription: false,
    skills: false,
    experience: false,
    industry: false,
    education: false
  });
  
  const [filterValues, setFilterValues] = useState({
    jobDescription: '',
    skills: '',
    experience: '',
    industry: '',
    education: ''
  });
  
  const inputRef = useRef(null);
  
  // Focus on the main input when component mounts
  useEffect(() => {
    if (!isCompact && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCompact]);
  
  const toggleFilter = (filterName) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
    
    // If activating a filter, focus it after render
    setTimeout(() => {
      const filterInput = document.getElementById(`filter-${filterName}`);
      if (filterInput && !activeFilters[filterName]) {
        filterInput.focus();
      }
    }, 10);
  };
  
  const updateFilterValue = (filterName, value) => {
    setFilterValues(prev => ({
      ...prev,
      [filterName]: value
    }));
  };
  
  const buildDescription = () => {
    // Build a structured description from the filters
    let descriptionParts = [];
    
    if (filterValues.jobDescription) {
      descriptionParts.push(`Job Description: ${filterValues.jobDescription}`);
    }

    if (filterValues.skills) {
      descriptionParts.push(`Skills: ${filterValues.skills}`);
    }
    
    if (filterValues.experience) {
      descriptionParts.push(`Years of Experience: ${filterValues.experience}`);
    }
    
    if (filterValues.industry) {
      descriptionParts.push(`Industry: ${filterValues.industry}`);
    }
    
    if (filterValues.education) {
      descriptionParts.push(`Education: ${filterValues.education}`);
    }
    
    return descriptionParts.join('\n');
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Build the description from filter values
    const generatedDescription = buildDescription();
    
    // Set the description for API call
    setDescription(generatedDescription);
    
    // 🔥 FIXED: Send complete search configuration including Elasticsearch method
    onSearch({
      position,
      description: generatedDescription || description,
      limit,
      score_threshold: scoreThreshold,
      fetch_education: true,
      
      // 🆕 CRITICAL: Include search method from config
      search_method: config.search.method,
      
      // 🆕 ELASTICSEARCH WEIGHTS
      es_weight: config.search.elasticsearchWeight,
      semantic_weight: config.search.semanticWeight,
      
      // Include filter values in the search data
      filters: filterValues,
      activeFilters: activeFilters,
      
      // Legacy weights for backward compatibility
      keyword_weight: config.search.keywordWeight,
      semantic_weight_legacy: config.search.semanticWeightLegacy
    });
  };
  
  // Parse the search query to extract filter values
  const parseSearchQuery = (query) => {
    if (!query) return { parsedFilters: {}, parsedActiveFilters: {} };
    
    const parsedFilters = {
      jobDescription: '',
      skills: '',
      experience: '',
      industry: '',
      education: ''
    };
    
    const parsedActiveFilters = {
      jobDescription: false,
      skills: false,
      experience: false,
      industry: false,
      education: false
    };
    
    // If the query has filters property, use it directly
    if (query.filters) {
      Object.keys(query.filters).forEach(key => {
        if (query.filters[key]) {
          parsedFilters[key] = query.filters[key];
          parsedActiveFilters[key] = true;
        }
      });
    } else if (query.description) {
      // Otherwise, parse from description
      const descriptionLines = query.description.split('\n');
      descriptionLines.forEach(line => {
        if (line.startsWith('Job Description: ')) {
          parsedFilters.jobDescription = line.replace('Job Description: ', '');
          parsedActiveFilters.jobDescription = true;
        } else if (line.startsWith('Skills: ')) {
          parsedFilters.skills = line.replace('Skills: ', '');
          parsedActiveFilters.skills = true;
        } else if (line.startsWith('Years of Experience: ')) {
          parsedFilters.experience = line.replace('Years of Experience: ', '');
          parsedActiveFilters.experience = true;
        } else if (line.startsWith('Industry: ')) {
          parsedFilters.industry = line.replace('Industry: ', '');
          parsedActiveFilters.industry = true;
        } else if (line.startsWith('Education: ')) {
          parsedFilters.education = line.replace('Education: ', '');
          parsedActiveFilters.education = true;
        }
      });
    }
    
    return { parsedFilters, parsedActiveFilters };
  };
  
  const { parsedFilters, parsedActiveFilters } = parseSearchQuery(currentSearchQuery);
  
  return (
    <div className={`w-full max-w-3xl mx-auto transition-all duration-300 ${isCompact ? 'py-2' : 'py-6'}`}>
      {/* 🆕 OPTIONAL: Show current search method in development */}
      {config.debug?.showSearchMethod && (
        <div className="mb-2 text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
          Search Method: {config.search.method}
          {config.search.method === 'hybrid' && (
            <span> (ES: {Math.round(config.search.elasticsearchWeight * 100)}% + Semantic: {Math.round(config.search.semanticWeight * 100)}%)</span>
          )}
        </div>
      )}
      
      {isSearching && currentSearchQuery && (
        <SearchSummary 
          position={currentSearchQuery.position}
          filters={currentSearchQuery.filters || parsedFilters}
          activeFilters={currentSearchQuery.activeFilters || parsedActiveFilters}
        />
      )}
      
      <form onSubmit={handleSubmit} className="w-full">
        <FilterBar 
          activeFilters={activeFilters}
          toggleFilter={toggleFilter}
          filterValues={filterValues}
          updateFilterValue={updateFilterValue}
          isCompact={isCompact}
        />
        
        <div className="mt-3 relative rounded-md shadow-sm">
          <input
            type="text"
            ref={inputRef}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder={translations[language].searchPlaceholder}
            required
            className="block w-full rounded-md border-0 py-4 px-4 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-black sm:text-sm sm:leading-6"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <button 
              type="submit" 
              className="rounded-md bg-black p-2.5 text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              aria-label={translations[language].searchButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </div>
        </div>
        
        {/* 🆕 OPTIONAL: Advanced settings panel for testing */}
        {config.showAdvancedSettings && !isCompact && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-gray-700">
                Advanced Search Settings
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Result Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                    className="block w-full rounded-md border-gray-300 text-sm focus:border-black focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Score Threshold
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={scoreThreshold}
                    onChange={(e) => setScoreThreshold(parseFloat(e.target.value))}
                    className="block w-full"
                  />
                  <span className="text-xs text-gray-500">{scoreThreshold}</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Method: <strong>{config.search.method}</strong>
                {config.search.method === 'elasticsearch' && ' (Fast text search with position boosting)'}
                {config.search.method === 'hybrid' && ` (${Math.round(config.search.elasticsearchWeight * 100)}% ES + ${Math.round(config.search.semanticWeight * 100)}% Semantic)`}
                {config.search.method === 'semantic' && ' (AI similarity matching)'}
              </div>
            </details>
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchInput;