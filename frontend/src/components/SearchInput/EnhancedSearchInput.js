// frontend/src/components/SearchInput/EnhancedSearchInput.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../LanguageContext';
import translations from '../../utils/translations';
import FilterBar from './FilterBar';
import SearchSummary from './SearchSummary';
import { getSearchSuggestions, getElasticsearchHealth } from '../../services/api';
import config from '../../configs/config';

const EnhancedSearchInput = ({ onSearch, isSearching, isCompact = false, currentSearchQuery }) => {
  const { language } = useLanguage();
  const [position, setPosition] = useState('');
  const [description, setDescription] = useState('');
  
  // Search method and parameters
  const [searchMethod, setSearchMethod] = useState(config.search.method);
  const [limit, setLimit] = useState(config.search.candidateLimit);
  const [scoreThreshold, setScoreThreshold] = useState(config.search.scoreThreshold);
  
  // Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  
  // Elasticsearch health
  const [esHealth, setEsHealth] = useState(null);
  
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
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);
  
  // Focus on the main input when component mounts
  useEffect(() => {
    if (!isCompact && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCompact]);
  
  // Check Elasticsearch health on mount
  useEffect(() => {
    if (config.search.elasticsearch.enabled) {
      checkElasticsearchHealth();
    }
  }, []);
  
  const checkElasticsearchHealth = async () => {
    try {
      const health = await getElasticsearchHealth();
      setEsHealth(health);
    } catch (error) {
      console.error('Failed to check Elasticsearch health:', error);
      setEsHealth({ status: 'error' });
    }
  };
  
  // Debounced suggestions
  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2 || !config.search.enableSuggestions) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    try {
      const suggestions = await getSearchSuggestions(query);
      setSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
      setSuggestionIndex(-1);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);
  
  const debouncedFetchSuggestions = useCallback((query) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, config.performance.debounceSearchMs);
  }, [fetchSuggestions]);
  
  const handlePositionChange = (e) => {
    const value = e.target.value;
    setPosition(value);
    debouncedFetchSuggestions(value);
  };
  
  const handleSuggestionClick = (suggestion) => {
    setPosition(suggestion);
    setShowSuggestions(false);
    setSuggestionIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        if (suggestionIndex >= 0) {
          e.preventDefault();
          handleSuggestionClick(suggestions[suggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSuggestionIndex(-1);
        break;
    }
  };
  
  const toggleFilter = (filterName) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
    
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
    
    const generatedDescription = buildDescription();
    setDescription(generatedDescription);
    
    // Hide suggestions
    setShowSuggestions(false);
    
    onSearch({
      position,
      description: generatedDescription || description,
      limit,
      score_threshold: scoreThreshold,
      search_method: searchMethod,
      fetch_education: true,
      filters: filterValues,
      activeFilters: activeFilters,
      es_weight: config.search.elasticsearchWeight,
      semantic_weight: config.search.semanticWeight,
      keyword_weight: config.search.keywordWeight,
      semantic_weight_legacy: config.search.semanticWeightLegacy
    });
  };
  
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
    
    if (query.filters) {
      Object.keys(query.filters).forEach(key => {
        if (query.filters[key]) {
          parsedFilters[key] = query.filters[key];
          parsedActiveFilters[key] = true;
        }
      });
    } else if (query.description) {
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
  
  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={`w-full max-w-3xl mx-auto transition-all duration-300 ${isCompact ? 'py-2' : 'py-6'}`}>
      {/* Elasticsearch Health Indicator */}
      {config.debug.showSearchMethod && esHealth && (
        <div className={`mb-2 text-xs px-2 py-1 rounded ${
          esHealth.status === 'available' 
            ? 'bg-green-100 text-green-800' 
            : esHealth.status === 'unavailable'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          Elasticsearch: {esHealth.status} | Search Method: {searchMethod}
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
        
        <div className="mt-3 relative" ref={suggestionsRef}>
          <div className="relative rounded-md shadow-sm">
            <input
              type="text"
              ref={inputRef}
              value={position}
              onChange={handlePositionChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
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
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`px-4 py-2 cursor-pointer text-sm ${
                    index === suggestionIndex 
                      ? 'bg-gray-100 text-black' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setSuggestionIndex(index)}
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    {suggestion}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Advanced Settings (if enabled) */}
        {config.showAdvancedSettings && !isCompact && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Advanced Settings</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Method */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Search Method
                </label>
                <select
                  value={searchMethod}
                  onChange={(e) => setSearchMethod(e.target.value)}
                  className="block w-full rounded-md border-gray-300 text-sm focus:border-black focus:ring-black"
                >
                  <option value="elasticsearch">Elasticsearch</option>
                  <option value="hybrid">Hybrid (ES + Semantic)</option>
                  <option value="semantic">Semantic Only</option>
                  <option value="bm25">BM25 (Legacy)</option>
                </select>
              </div>
              
              {/* Result Limit */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {translations[language].resultLimit}
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
              
              {/* Score Threshold */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {translations[language].scoreThreshold}
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
            
            {/* Search Method Info */}
            <div className="mt-3 text-xs text-gray-600">
              {searchMethod === 'elasticsearch' && (
                <p>🔍 Using Elasticsearch for fast text search with position title boosting</p>
              )}
              {searchMethod === 'hybrid' && (
                <p>⚡ Combining Elasticsearch ({Math.round(config.search.elasticsearchWeight * 100)}%) + Semantic similarity ({Math.round(config.search.semanticWeight * 100)}%)</p>
              )}
              {searchMethod === 'semantic' && (
                <p>🧠 Using semantic similarity with OpenAI embeddings only</p>
              )}
              {searchMethod === 'bm25' && (
                <p>📊 Using BM25 algorithm with PostgreSQL full-text search</p>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default EnhancedSearchInput;