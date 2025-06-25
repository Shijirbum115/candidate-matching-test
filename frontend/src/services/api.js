// frontend/src/services/api.js - FIXED VERSION
import config from '../configs/config';

const getApiBaseUrl = () => {
  return config.api.baseUrl;
};

const API_BASE_URL = getApiBaseUrl();
const DEFAULT_USER_ID = config.api.defaultUserId;
const FILE_CONFIG = config.files;

console.log('API Base URL:', API_BASE_URL);
console.log('File Configuration:', FILE_CONFIG);

// Add image cache for profile pics to prevent flickering
const profileImageCache = new Map();

// Suggestions cache
const suggestionsCache = new Map();

// FIXED: Use the unified search endpoint that returns search_id
export const searchCandidates = async (searchData) => {
  try {
    // Use config values for search method and parameters
    const requestData = {
      ...searchData,
      fetch_education: true,
      // Use config defaults if not provided
      limit: searchData.limit || config.search.candidateLimit,
      score_threshold: searchData.score_threshold ?? config.search.scoreThreshold,
      
      // Elasticsearch-specific parameters
      search_method: searchData.search_method || config.search.method,
      es_weight: searchData.es_weight ?? config.search.elasticsearchWeight,
      semantic_weight: searchData.semantic_weight ?? config.search.semanticWeight,
      
      // Legacy parameters for backward compatibility
      keyword_weight: searchData.keyword_weight ?? config.search.keywordWeight,
      semantic_weight_legacy: searchData.semantic_weight_legacy ?? config.search.semanticWeightLegacy
    };

    if (config.debug.logSearchQueries) {
      console.log('Sending search request:', {
        method: requestData.search_method,
        limit: requestData.limit,
        score_threshold: requestData.score_threshold,
        es_weight: requestData.es_weight,
        semantic_weight: requestData.semantic_weight
      });
    }

    const response = await fetch(`${API_BASE_URL}${config.api.endpoints.search}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
      timeout: config.api.requestTimeout
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to search candidates');
    }

    const data = await response.json();
    
    if (config.debug.logElasticsearchScores && data.candidates?.length > 0) {
      console.log('Search results with ES scores:', data.candidates.slice(0, 3).map(result => ({
        candidate_id: result.candidate_id,
        elasticsearch_score: result.experiences?.[0]?.elasticsearch_score,
        final_score: result.final_score
      })));
    }
    
    return data; // Returns { search_id, candidates, search_query }
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// REMOVED: searchWithSave function since main search now handles this
// The main searchCandidates function now returns search_id automatically

// Candidate saving functions
export const saveCandidate = async (searchId, candidateId, note = '') => {
  try {
    const response = await fetch(`${API_BASE_URL}/save_candidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        search_id: searchId,
        candidate_id: candidateId,
        note: note
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to save candidate');
    }

    return await response.json();
  } catch (error) {
    console.error('Save candidate API error:', error);
    throw error;
  }
};

export const unsaveCandidate = async (searchId, candidateId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/save_candidate/${searchId}/${candidateId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to unsave candidate');
    }

    return await response.json();
  } catch (error) {
    console.error('Unsave candidate API error:', error);
    throw error;
  }
};

export const getSavedCandidates = async (searchId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/saved_candidates/${searchId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get saved candidates');
    }

    return await response.json();
  } catch (error) {
    console.error('Get saved candidates API error:', error);
    throw error;
  }
};

// Updated saved searches to only show those with saved candidates
export const getSavedSearchesWithCandidates = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/saved_searches_with_candidates/${DEFAULT_USER_ID}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get saved searches');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Elasticsearch-specific functions
export const getSearchSuggestions = async (query, limit = null) => {
  try {
    const suggestionLimit = limit || config.search.suggestionLimit;
    const cacheKey = `${query}_${suggestionLimit}`;
    
    // Check cache first
    if (suggestionsCache.has(cacheKey)) {
      const cached = suggestionsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < config.performance.suggestionsCacheMs) {
        return cached.data;
      }
    }

    const response = await fetch(
      `${API_BASE_URL}${config.api.endpoints.suggestions}?q=${encodeURIComponent(query)}&limit=${suggestionLimit}`
    );

    if (!response.ok) {
      throw new Error('Failed to get suggestions');
    }

    const data = await response.json();
    
    // Cache the results
    suggestionsCache.set(cacheKey, {
      data: data.suggestions || [],
      timestamp: Date.now()
    });

    return data.suggestions || [];
  } catch (error) {
    console.error('Suggestions API error:', error);
    return [];
  }
};

export const getSearchFacets = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}${config.api.endpoints.facets}`);

    if (!response.ok) {
      throw new Error('Failed to get search facets');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Facets API error:', error);
    return {};
  }
};

export const getElasticsearchHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}${config.api.endpoints.elasticsearchHealth}`);

    if (!response.ok) {
      throw new Error('Failed to get Elasticsearch health');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Elasticsearch health API error:', error);
    return { status: 'error', error: error.message };
  }
};

export const triggerReindex = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}${config.api.endpoints.reindex}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to trigger reindex');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Reindex API error:', error);
    throw error;
  }
};

// Utility function to clear suggestions cache
export const clearSuggestionsCache = () => {
  suggestionsCache.clear();
};

// All existing functions remain unchanged...
export const getCandidateEducation = async (candidateId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/candidate_education/${candidateId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get candidate education');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

export const getBatchEducation = async (candidateIds) => {
  try {
    const response = await fetch(`${API_BASE_URL}/batch_education`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(candidateIds),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get batch education');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

export const getResumeUrl = (resumePath) => {
  if (!resumePath || typeof resumePath !== 'string' || resumePath.trim() === '') {
    return null;
  }
  
  return `${FILE_CONFIG.resumeBaseUrl}/${resumePath}`;
};

export const getProfileImageUrl = (candidateId, profilePic) => {
  if (profileImageCache.has(candidateId)) {
    return profileImageCache.get(candidateId);
  }
  
  if (!profilePic || typeof profilePic !== 'string' || profilePic.trim() === '') {
    const defaultUrl = `${process.env.PUBLIC_URL}${FILE_CONFIG.defaultProfileImage}`;
    profileImageCache.set(candidateId, defaultUrl);
    return defaultUrl;
  }
  
  const hasJpgExtension = profilePic.toLowerCase().endsWith('.jpg');
  const cacheBuster = `?candidateId=${candidateId}&t=${Date.now()}`;
  const url = `${FILE_CONFIG.profileImageBaseUrl}/${profilePic}${hasJpgExtension ? '' : '.jpg'}${cacheBuster}`;
  
  profileImageCache.set(candidateId, url);
  return url;
};

export const prefetchProfileImage = (candidateId, profilePic) => {
  const url = getProfileImageUrl(candidateId, profilePic);
  
  const img = new Image();
  img.src = url;
  
  return url;
};

export const getCandidateAllExperiences = async (candidateId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/candidate_all_experiences/${candidateId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get candidate all experiences');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

export const saveSearch = async (searchName, searchQuery) => {
  try {
    const response = await fetch(`${API_BASE_URL}/save_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: DEFAULT_USER_ID,
        search_name: searchName,
        search_query: searchQuery
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to save search');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

export const getSavedSearches = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/saved_searches/${DEFAULT_USER_ID}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get saved searches');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Cache for applications to prevent duplicate requests
const applicationsCache = new Map();
const CACHE_DURATION = config.performance.cacheExpirationMinutes * 60 * 1000;

export const getCandidateApplications = async (candidateId) => {
  try {
    const cacheKey = candidateId;
    const cached = applicationsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const response = await fetch(`${API_BASE_URL}/candidate_applications/${candidateId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to get candidate applications');
    }
    
    const data = await response.json();
    
    applicationsCache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

export const getBatchApplications = async (candidateIds) => {
  try {
    const uncachedIds = candidateIds.filter(id => {
      const cached = applicationsCache.get(id);
      return !cached || Date.now() - cached.timestamp >= CACHE_DURATION;
    });

    let batchData = {};
    
    if (uncachedIds.length > 0) {
      const response = await fetch(`${API_BASE_URL}/batch_applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uncachedIds),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get batch applications');
      }
      
      batchData = await response.json();
      
      Object.entries(batchData).forEach(([candidateId, applications]) => {
        applicationsCache.set(parseInt(candidateId), {
          data: applications,
          timestamp: Date.now()
        });
      });
    }

    const result = {};
    candidateIds.forEach(id => {
      const cached = applicationsCache.get(id);
      if (cached) {
        result[id] = cached.data;
      } else if (batchData[id]) {
        result[id] = batchData[id];
      } else {
        result[id] = [];
      }
    });
    
    return result;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

export const clearApplicationsCache = () => {
  applicationsCache.clear();
};