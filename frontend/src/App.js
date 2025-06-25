// src/App.js - SIMPLIFIED VERSION (no separate saved candidates view)
import React, { useState, useEffect, useCallback } from 'react';
import { LanguageProvider, useLanguage } from './components/LanguageContext';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import CandidateDetail from './components/CandidateDetail';
import { searchCandidates, saveCandidate, unsaveCandidate, getSavedCandidates } from './services/api';
import './styles/App.css';

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentSearchQuery, setCurrentSearchQuery] = useState(null);
  const [refreshSidebar, setRefreshSidebar] = useState(0);
  
  // Candidate saving state
  const [currentSearchId, setCurrentSearchId] = useState(null);
  const [savedCandidateIds, setSavedCandidateIds] = useState(new Set());
  
  // SIMPLIFIED: Only search mode, no separate saved view
  const [isViewingSavedCandidates, setIsViewingSavedCandidates] = useState(false);
  const [currentSavedSearch, setCurrentSavedSearch] = useState(null);

  // Handle search with unified endpoint
  const handleSearch = async (searchData) => {
    setIsLoading(true);
    setError(null);
    setIsSearching(true);
    setSelectedCandidate(null);
    setCurrentSearchQuery(searchData);
    setIsViewingSavedCandidates(false); // Reset to search mode
    setSavedCandidateIds(new Set()); // Reset saved state for new search
    
    try {
      const results = await searchCandidates({
        ...searchData,
        fetch_education: true
      });
      
      setSearchResults(results.candidates || []);
      setCurrentSearchId(results.search_id);
      
      // Trigger sidebar refresh if search was saved (has results and search_id)
      if (results.search_id && results.candidates?.length > 0) {
        triggerSidebarRefresh();
      }
      
    } catch (err) {
      setError('Failed to search candidates. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle new search (clear everything)
  const handleNewSearch = () => {
    setIsSearching(false);
    setSearchResults(null);
    setSelectedCandidate(null);
    setCurrentSearchQuery(null);
    setCurrentSearchId(null);
    setSavedCandidateIds(new Set());
    setIsViewingSavedCandidates(false);
    setCurrentSavedSearch(null);
  };
  
  // Handle candidate selection
  const handleSelectCandidate = useCallback((candidate) => {
    setSelectedCandidate(prev => {
      if (prev && prev.candidate_id === candidate.candidate_id) {
        return prev;
      }
      return candidate;
    });
  }, []);

  // Handle back from candidate detail
  const handleBackFromDetail = useCallback(() => {
    setSelectedCandidate(null);
  }, []);

  // Handle candidate saving/unsaving
  const handleToggleSaveCandidate = async (candidateId) => {
    if (!currentSearchId) {
      console.error('No current search to save candidate to');
      return;
    }

    try {
      const isCurrentlySaved = savedCandidateIds.has(candidateId);
      
      if (isCurrentlySaved) {
        await unsaveCandidate(currentSearchId, candidateId);
        setSavedCandidateIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(candidateId);
          return newSet;
        });
        
        // If viewing saved candidates, remove from results too
        if (isViewingSavedCandidates) {
          setSearchResults(prev => prev.filter(c => c.candidate_id !== candidateId));
        }
      } else {
        await saveCandidate(currentSearchId, candidateId);
        setSavedCandidateIds(prev => new Set([...prev, candidateId]));
      }
      
      // Refresh sidebar to update candidate counts
      triggerSidebarRefresh();
      
    } catch (error) {
      console.error('Failed to toggle save candidate:', error);
      setError('Failed to save/unsave candidate. Please try again.');
    }
  };

  // SIMPLIFIED: Handle loading saved search - shows saved candidates in normal candidate list
  const handleLoadSavedSearch = async (savedSearch) => {
    setIsLoading(true);
    setError(null);
    setIsSearching(true);
    setSelectedCandidate(null);
    setCurrentSearchQuery(savedSearch.search_query);
    setCurrentSearchId(savedSearch.id);
    setCurrentSavedSearch(savedSearch);
    setIsViewingSavedCandidates(true); // Flag that we're viewing saved candidates
    
    try {
      // Load saved candidates for this search
      const savedCandidatesData = await getSavedCandidates(savedSearch.id);
      
      // Convert saved candidates to the same format as search results
      const candidatesForDisplay = savedCandidatesData.map(savedCandidate => ({
        candidate_id: savedCandidate.candidate_id,
        first_name: savedCandidate.first_name,
        last_name: savedCandidate.last_name,
        email: savedCandidate.email,
        phone: savedCandidate.phone,
        gender: savedCandidate.gender,
        registration_number: savedCandidate.registration_number,
        birthdate: savedCandidate.birthdate,
        profile_pic: savedCandidate.profile_pic,
        resume: savedCandidate.resume,
        pst_score: savedCandidate.pst_score,
        pst_date: savedCandidate.pst_date,
        final_score: 1.0, // Default score for saved candidates
        experiences: [], // Will be loaded separately if needed
        education: [] // Will be loaded separately if needed
      }));
      
      setSearchResults(candidatesForDisplay);
      
      // Mark all as saved
      const savedIds = new Set(candidatesForDisplay.map(c => c.candidate_id));
      setSavedCandidateIds(savedIds);
      
    } catch (error) {
      console.error('Failed to load saved candidates:', error);
      setError('Failed to load saved candidates.');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSidebarRefresh = useCallback(() => {
    setRefreshSidebar(prev => prev + 1);
  }, []);

  return (
    <div className="app-container">
      <Sidebar 
        onNewSearch={handleNewSearch}
        onLoadSavedSearch={handleLoadSavedSearch}
        refreshTrigger={refreshSidebar}
      />
      
      <div className="content-container">
        <MainContent 
          isSearching={isSearching}
          onSearch={handleSearch}
          searchResults={searchResults}
          isLoading={isLoading}
          error={error}
          onSelectCandidate={handleSelectCandidate}
          selectedCandidateId={selectedCandidate?.candidate_id}
          currentSearchQuery={currentSearchQuery}
          // Saving props
          currentSearchId={currentSearchId}
          savedCandidateIds={savedCandidateIds}
          onToggleSaveCandidate={handleToggleSaveCandidate}
          // SIMPLIFIED: Pass info about viewing saved candidates
          isViewingSavedCandidates={isViewingSavedCandidates}
          currentSavedSearch={currentSavedSearch}
        />
        
        {selectedCandidate && (
          <CandidateDetail 
            candidate={selectedCandidate}
            onBack={handleBackFromDetail}
            // Saving props
            currentSearchId={currentSearchId}
            isSaved={savedCandidateIds.has(selectedCandidate.candidate_id)}
            onToggleSave={() => handleToggleSaveCandidate(selectedCandidate.candidate_id)}
          />
        )}
      </div>
    </div>
  );
}

export default App;