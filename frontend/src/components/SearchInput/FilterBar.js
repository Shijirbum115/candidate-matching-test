// src/components/SearchInput/FilterBar.js
import React from 'react';
import { useLanguage } from '../LanguageContext';
import translations from '../../utils/translations';
import FilterInput from './FilterInput';

const FilterBar = ({ 
  activeFilters, 
  toggleFilter, 
  filterValues, 
  updateFilterValue,
  isCompact
}) => {
  const { language } = useLanguage();
  
  const filters = [
    {
      id: 'jobDescription',
      label: translations[language].jobDescription || 'Job Description',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
      placeholder: translations[language].jobDescriptionPlaceholder || 'Responsibilities, requirements, duties...'
    },
    {
      id: 'skills',
      label: translations[language].skills || 'Skills',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
          <path d="M2 17l10 5 10-5"></path>
          <path d="M2 12l10 5 10-5"></path>
        </svg>
      ),
      placeholder: translations[language].skillsPlaceholder || 'Python, SQL, Machine Learning...'
    },
    {
      id: 'experience',
      label: translations[language].experience || 'Experience',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      placeholder: translations[language].experiencePlaceholder || '3-5 years...'
    },
    {
      id: 'industry',
      label: translations[language].industry || 'Industry',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        </svg>
      ),
      placeholder: translations[language].industryPlaceholder || 'Finance, Technology, Healthcare...'
    },
    {
      id: 'education',
      label: translations[language].education || 'Education',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
          <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
        </svg>
      ),
      placeholder: translations[language].educationPlaceholder || "Bachelor's, Master's..."
    }
  ];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${isCompact ? 'mb-2' : 'mb-4'}`}>
      {filters.map((filter) => (
        <div key={filter.id} className="flex flex-col">
          <button
            type="button"
            onClick={() => toggleFilter(filter.id)}
            className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeFilters[filter.id]
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
            aria-pressed={activeFilters[filter.id]}
          >
            <span className="mr-2">{filter.icon}</span>
            {filter.label}
          </button>
          
          {activeFilters[filter.id] && (
            <FilterInput
              id={filter.id}
              value={filterValues[filter.id]}
              onChange={(value) => updateFilterValue(filter.id, value)}
              placeholder={filter.placeholder}
              isCompact={isCompact}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default FilterBar;