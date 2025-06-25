// frontend/src/configs/config.js - OPTIMIZED VERSION
const config = {
  // UI Configuration
  showAdvancedSettings: true,
  showRelevantJobHighlighting: true,  // Enable to see match types
  showRelevantBadges: true,           // Show exact/synonym/partial badges
  showRelevantExperienceSection: false,

  // === SEARCH PARAMETERS - OPTIMIZED FOR EXACT POSITION TITLE MATCHING ===
  search: {
    // PRIMARY SEARCH METHOD - Use optimized Elasticsearch
    method: "elasticsearch",  // Pure ES for best position title matching
    
    // Elasticsearch settings - HIGHLY OPTIMIZED
    elasticsearch: {
      enabled: true,
      fallbackToPostgres: true,
      boostPositionTitle: true,    // Critical for position matching
      fuzzyMatching: true,         // Handles typos
      highlightResults: true,
      
      // Performance optimizations
      requestTimeout: 8000,        // 8 second timeout
      maxRetries: 2,              // Fast fail with retries
      cacheEnabled: true,         // Enable result caching
      cacheExpiryMs: 900000      // 15 minute cache (longer for consistency)
    },
    
    // Weights for different search methods
    elasticsearchWeight: 1.0,     // 100% Elasticsearch for speed and accuracy
    semanticWeight: 0.0,          // 0% semantic (disable for pure ES performance)
    
    // Search behavior - optimized for precision
    scoreThreshold: 0.1,          // Lower threshold to catch more matches
    candidateLimit: 100,          // Increased limit for better coverage
    
    // Legacy weights (not used with pure ES)
    keywordWeight: 0.8,
    semanticWeightLegacy: 0.2,
    
    // Suggestions and autocomplete
    enableSuggestions: true,
    suggestionLimit: 10,
    suggestionDebounceMs: 300,   // Slightly longer for consistency
    
    // Faceted search
    enableFacets: true,          // Enable for filters
    
    // Position title specific settings (used by backend)
    positionTitleBoost: 100.0,    // Very high boost for exact title matches
    exactMatchBoost: 80.0,        // High boost for exact phrase matches
    phraseMatchBoost: 50.0,       // Medium for synonym matches
    contentBoost: 5.0             // Low for content matches
  },

  // API Configuration
  api: {
    baseUrl: process.env.REACT_APP_API_BASE_URL || 
             (process.env.NODE_ENV === 'development' 
              ? `http://${window.location.hostname}:8001` 
              : 'http://localhost:8001'),
    defaultUserId: 1,
    requestTimeout: 15000,  // Longer timeout for complex searches
    
    endpoints: {
      search: '/search',
      suggestions: '/search/suggestions',
      facets: '/search/facets',
      elasticsearchHealth: '/elasticsearch/health',
      reindex: '/elasticsearch/reindex',
      cacheStats: '/cache/stats'  // New endpoint for monitoring
    }
  },

  // File Storage Configuration
  files: {
    resumeBaseUrl: process.env.REACT_APP_RESUME_BASE_URL || 'https://uploads.careers.mcs.mn/r',
    profileImageBaseUrl: process.env.REACT_APP_PROFILE_IMAGE_BASE_URL || 'https://uploads.careers.mcs.mn/u/b',
    defaultProfileImage: process.env.REACT_APP_DEFAULT_PROFILE_IMAGE || '/images/profile_example_pic.png'
  },

  // Performance Configuration - ENHANCED for consistency
  performance: {
    imagePreloadCount: 5,
    cacheExpirationMinutes: 30,    // Longer cache for consistency
    batchRequestDelayMs: 100,      // Slightly longer to batch better
    debounceSearchMs: 400,         // Longer debounce to reduce API calls
    suggestionsCacheMs: 1800000,   // 30 minute suggestion cache
    
    // Elasticsearch specific
    elasticsearchBatchSize: 50,    
    enableQueryCache: true,        
    preloadCommonQueries: true,    
    
    // New: Translation consistency settings
    translationCacheMs: 604800000, // 7 days (matches backend)
    searchConsistencyMode: true    // Enable features for search consistency
  },

  // Debug and Development
  debug: {
    logSearchQueries: true,
    logElasticsearchScores: true,
    showSearchMethod: true,
    showQueryTime: true,           
    logSlowQueries: true,          
    slowQueryThresholdMs: 2000,    // 2 second threshold
    showMatchTypes: true,          // Show exact/synonym/partial match indicators
    logTranslationCache: true      // Log cache hits/misses
  },

  // New: Search result display configuration
  display: {
    showMatchTypeIndicators: true,  // Show badges for match types
    highlightExactMatches: true,    // Highlight exact title matches
    groupByMatchType: false,        // Whether to group results by match type
    showScoreBreakdown: false,      // Show detailed scoring (debug)
    maxPositionTitleLength: 50,     // Truncate long titles
    showCompanyInResults: true      // Show company names in result cards
  },

  // New: Search quality settings
  quality: {
    enableSpellCheck: true,         // Enable spell checking for queries
    autoCorrectThreshold: 0.8,      // Auto-correct confidence threshold
    showDidYouMean: true,           // Show "Did you mean" suggestions
    fuzzyMatchTolerance: 2,         // Max edit distance for fuzzy matching
    minimumQueryLength: 2           // Minimum characters before searching
  }
};

export default config;