// src/components/CandidateDetail.js - FIXED with back button and proper star position
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from './LanguageContext';
import translations from '../utils/translations';
import config from '../configs/config';
import { getCandidateEducation, getProfileImageUrl, getResumeUrl, getCandidateAllExperiences } from '../services/api';
import StarButton from './StarButton';
import ApplicationHistory from './ApplicationHistory';
import '../styles/CandidateDetail.css';

const CandidateDetail = ({ 
  candidate, 
  onBack,
  // NEW: Saving props
  currentSearchId,
  isSaved = false,
  onToggleSave
}) => {
  const { language } = useLanguage();
  const [education, setEducation] = useState([]);
  const [isLoadingEducation, setIsLoadingEducation] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(true);
  const previousCandidateIdRef = useRef(null);
  const [resumeUrl, setResumeUrl] = useState(null);
  const [hasResume, setHasResume] = useState(false);
  const [allExperiences, setAllExperiences] = useState([]);
  const [isLoadingExperiences, setIsLoadingExperiences] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (candidate) {
      console.log('Candidate resume data:', {
        candidate_id: candidate.candidate_id,
        resume: candidate.resume,
        hasResume: Boolean(candidate.resume)
      });
    }
  }, [candidate]);
  
  // Set up image when candidate changes
  useEffect(() => {
    if (!candidate) return;
    
    // Check if the candidate has changed
    if (previousCandidateIdRef.current !== candidate.candidate_id) {
      previousCandidateIdRef.current = candidate.candidate_id;
      
      // Start with default image to prevent flicker
      setImageSrc(`${process.env.PUBLIC_URL}/images/profile_example_pic.png`);
      setIsImageLoading(true);
      
      // Get the profile image URL from our service
      const profileImageUrl = getProfileImageUrl(candidate.candidate_id, candidate.profile_pic);
      
      // Create a new image element to preload the image
      const img = new Image();
      img.onload = () => {
        // Only update the src if this is still the current candidate
        if (previousCandidateIdRef.current === candidate.candidate_id) {
          setImageSrc(profileImageUrl);
          setIsImageLoading(false);
        }
      };
      
      img.onerror = () => {
        // On error, use the default image
        setImageSrc(`${process.env.PUBLIC_URL}/images/profile_example_pic.png`);
        setIsImageLoading(false);
      };
      
      // Start loading the image
      img.src = profileImageUrl;
      const resume = candidate.resume;
      if (resume) {
        setResumeUrl(getResumeUrl(resume));
        setHasResume(true);
      } else {
        setResumeUrl(null);
        setHasResume(false);
      }
    }
    
  }, [candidate]);
  
  // Load education data when the candidate changes
  useEffect(() => {
    const loadEducation = async () => {
      // Check if education data already exists in the candidate object
      if (candidate && candidate.education) {
        setEducation(candidate.education);
        setIsLoadingEducation(false);
        return;
      }
      
      if (!candidate || !candidate.candidate_id) return;
      
      setIsLoadingEducation(true);
      try {
        const educationData = await getCandidateEducation(candidate.candidate_id);
        setEducation(educationData);
      } catch (err) {
        // console.error('Failed to load education data:', err);
        setEducation([]);
      } finally {
        setIsLoadingEducation(false);
      }
    };
    
    loadEducation();
  }, [candidate]);
  
  // Load all experiences when candidate changes
  useEffect(() => {
    const loadAllExperiences = async () => {
      if (!candidate || !candidate.candidate_id) return;
      
      setIsLoadingExperiences(true);
      try {
        const allExpData = await getCandidateAllExperiences(candidate.candidate_id);
        console.log(`Loaded ${allExpData.length} total experiences for candidate ${candidate.candidate_id}:`, allExpData);
        setAllExperiences(allExpData);
      } catch (err) {
        console.error('Failed to load all experiences:', err);
        // Fallback to showing only relevant experiences if API fails
        setAllExperiences(candidate.experiences || []);
      } finally {
        setIsLoadingExperiences(false);
      }
    };
    
    loadAllExperiences();
  }, [candidate]);

  const formatExperienceDate = (dateString) => {
    if (!dateString) return 'Present';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };
  
  // Helper function to display data or N/A
  const displayValue = (value) => {
    return value || translations[language].notAvailable;
  };

  // Add a new function to format gender values
  const formatGender = (genderValue) => {
    if (!genderValue) return translations[language].notAvailable;
    
    if (genderValue.toLowerCase() === 'f') {
      return language === 'mn' ? 'Эмэгтэй' : 'Female';
    } else if (genderValue.toLowerCase() === 'm') {
      return language === 'mn' ? 'Эрэгтэй' : 'Male';
    }
  
    // Return original value if not 'f' or 'm'
    return genderValue;
  };

  // Helper function to get candidate's full name
  const getCandidateFullName = () => {
    const firstName = candidate.first_name || '';
    const lastName = candidate.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || `Candidate #${candidate.candidate_id}`;
  };

  const isRelevantExperience = (experience) => {
    // NEW: Check config to see if we should show relevant highlighting
    if (!config.showRelevantJobHighlighting) {
      return false; // Don't highlight any as relevant
    }
    
    // Check if this experience is in the relevant experiences list
    return candidate.experiences?.some(relevantExp => 
      relevantExp.company_name === experience.company_name &&
      relevantExp.position_title === experience.position_title &&
      Math.abs(relevantExp.years - experience.years) < 0.1 // Allow small floating point differences
    );
  };

  // NEW: Handle star button in detail view
  const handleDetailStarClick = async () => {
    if (!currentSearchId || !onToggleSave) {
      console.warn('Cannot save candidate: no search context');
      return;
    }

    setIsSaving(true);
    try {
      await onToggleSave();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="candidate-detail">
      {/* FIXED: Back Button - Restored and positioned at top */}
      <div className="detail-back-button">
        <button onClick={onBack} className="back-button">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"></path>
            <path d="M12 19l-7-7 7-7"></path>
          </svg>
          {language === 'mn' ? 'Буцах' : 'Back'}
        </button>
      </div>

      <div className="detail-header">
        <div className="profile-header">
          <div className={`profile-picture-container ${isImageLoading ? 'loading' : ''}`}>
            <img 
              src={imageSrc}
              alt="Profile" 
              className="profile-picture" 
              onError={(e) => {
                e.target.src = `${process.env.PUBLIC_URL}/images/profile_example_pic.png`;
              }}
            />
            {isImageLoading && (
              <div className="profile-picture-loader">
                <div className="loader-spinner"></div>
              </div>
            )}
          </div>
          <div className="header-info">
            {/* FIXED: Name and star in same row (horizontal layout) */}
            <div className="name-and-star-horizontal">
              <h2>{getCandidateFullName()}</h2>
              {/* FIXED: Star button positioned to the right of name */}
              {currentSearchId && (
                <StarButton
                  isStarred={isSaved}
                  isLoading={isSaving}
                  onToggle={handleDetailStarClick}
                  size="large"
                />
              )}
            </div>
            <div className="match-score">
              {translations[language].matchScore}: <span className="score">{candidate.final_score?.toFixed(2) || '1.00'}</span>
            </div>
          </div>
        </div>
        
        <div className="personal-info">
          <div className="info-group">
            <div className="info-item">
              <span className="info-label">{translations[language].id}:</span>
              <span className="info-value">{candidate.candidate_id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">{translations[language].registrationNumber}:</span>
              <span className="info-value">{displayValue(candidate.registration_number)}</span>
            </div>
          </div>
          
          <div className="info-group">
            <div className="info-item">
              <span className="info-label">{translations[language].email}:</span>
              <span className="info-value">{displayValue(candidate.email)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">{translations[language].phone}:</span>
              <span className="info-value">{displayValue(candidate.phone)}</span>
            </div>
          </div>
          
          <div className="info-group">
            <div className="info-item">
              <span className="info-label">{translations[language].gender}:</span>
              <span className="info-value">{formatGender(candidate.gender)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">{translations[language].birthdate}:</span>
              <span className="info-value">{displayValue(candidate.birthdate)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="detail-section">
        <h3>{translations[language].education}</h3>
        {isLoadingEducation ? (
          <div className="loading-education">
            <div className="education-loader">
              <div className="loader-spinner"></div>
            </div>
            <div>{language === 'mn' ? 'Боловсролын мэдээлэл ачааллаж байна...' : 'Loading education data...'}</div>
          </div>
        ) : education && education.length > 0 ? (
          <div className="education-list">
            {education.map((edu, index) => (
              <div key={index} className="education-item">
                {/* Header with Institution and Years */}
                <div className="education-header">
                  <div className="institution">
                    {displayValue(edu.institution || edu.school, 
                      language === 'mn' ? 'Тодорхойгүй сургууль' : 'Unknown Institution')}
                  </div>
                  <div className="years">
                    {edu.start_year ? edu.start_year : '?'} - {edu.end_year ? edu.end_year : '?'}
                  </div>
                </div>
                
                <div className="education-details">
                  {/* Field of Study (pro) */}
                  {(edu.field_of_study || edu.pro) && (
                    <div className="education-detail-item">
                      <span className="detail-label">
                        {language === 'mn' ? 'Мэргэжил:' : 'Field of Study:'}
                      </span>
                      <span className="detail-value">
                        {edu.field_of_study || edu.pro}
                      </span>
                    </div>
                  )}
                  
                  {/* Degree Information */}
                  {edu.degree_name && (
                    <div className="education-detail-item">
                      <span className="detail-label">
                        {language === 'mn' ? 'Зэрэг:' : 'Degree:'}
                      </span>
                      <span className="detail-value">{edu.degree_name}</span>
                    </div>
                  )}
                  
                  {/* GPA */}
                  {edu.gpa && (
                    <div className="education-detail-item">
                      <span className="detail-label">
                        {language === 'mn' ? 'Голч дүн:' : 'GPA:'}
                      </span>
                      <span className="detail-value gpa-value">{edu.gpa}</span>
                    </div>
                  )}
                  
                  {/* Study Period (more detailed) */}
                  {(edu.start_year || edu.end_year) && (
                    <div className="education-detail-item">
                      <span className="detail-label">
                        {language === 'mn' ? 'Суралцсан хугацаа:' : 'Study Period:'}
                      </span>
                      <span className="detail-value">
                        {edu.start_year ? 
                          `${edu.start_year} ${language === 'mn' ? 'оноос' : 'to'} ${edu.end_year || (language === 'mn' ? 'одоо хүртэл' : 'present')}` :
                          `${language === 'mn' ? 'Төгссөн:' : 'Graduated:'} ${edu.end_year || 'Unknown'}`
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">
            <div className="no-data-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
              </svg>
            </div>
            <p>{translations[language].noEducationData}</p>
          </div>
        )}
      </div>
      
      <div className="detail-section">
        {/* Conditional section title based on config */}
        <h3>
          {config.showRelevantExperienceSection 
            ? (language === 'mn' ? 'Бүх туршлага' : 'All Experiences')
            : (language === 'mn' ? 'Ажлын туршлага' : 'Work Experience')
          }
        </h3>
        
        {isLoadingExperiences ? (
          <div className="loading-experiences">
            <div className="experience-loader">
              <div className="loader-spinner"></div>
            </div>
            <div>{language === 'mn' ? 'Туршлагын мэдээлэл ачааллаж байна...' : 'Loading experience data...'}</div>
          </div>
        ) : allExperiences && allExperiences.length > 0 ? (
          allExperiences.map((exp, index) => {
            const isRelevant = isRelevantExperience(exp);
            return (
              <div key={index} className={`experience-card ${isRelevant ? 'relevant-experience' : ''}`}>
                {/* Conditional relevant badge based on config */}
                {isRelevant && config.showRelevantBadges && (
                  <div className="relevant-badge">
                    {language === 'mn' ? 'Холбогдох' : 'Relevant'}
                  </div>
                )}
                <div className="experience-header">
                  <div className="company-name">{exp.company_name || "N/A"}</div>
                  {/* Conditional score display based on config */}
                  {isRelevant && config.showRelevantJobHighlighting && exp.combined_score && (
                    <div className="exp-score">
                      {translations[language].score}: {exp.combined_score.toFixed(2)}
                    </div>
                  )}
                  {/* UPDATED: Show date range with years */}
                  <div className="exp-duration">
                    <strong>
                      {formatExperienceDate(exp.start_date)} - {formatExperienceDate(exp.end_date)}
                    </strong>
                  </div>
                </div>
                
                <div className="experience-content">
                  {language === 'mn' && exp.structured_content_mn ? exp.structured_content_mn : exp.content}
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-data">{translations[language].noExperienceData}</div>
        )}
      </div>
      
      <ApplicationHistory candidate={candidate} />
      
      <div className="actions">
        {/* Changed: Updated button to "View on Careers" with gradient and link */}
        <a 
          href="https://careers.mcs.mn/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="view-careers-button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          {language === 'mn' ? 'Careers дээр үзэх' : 'View on Careers'}
        </a>
        <button 
          className={`download-button ${!candidate.resume ? 'disabled' : ''}`}
          onClick={() => {
            console.log('Resume button clicked', {
              hasResume: Boolean(candidate.resume),
              resumeValue: candidate.resume
            });
            
            if (!candidate.resume) {
              console.log('No resume available');
              return;
            }
            
            const resumeUrl = getResumeUrl(candidate.resume);
            console.log('Generated resume URL:', resumeUrl);
            
            if (!resumeUrl) {
              console.log('Invalid resume URL');
              return;
            }
            
            // Create a temporary link and trigger the download
            const link = document.createElement('a');
            link.href = resumeUrl;
            link.target = '_blank';
            link.download = `resume_${candidate.candidate_id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          disabled={!candidate.resume}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          {translations[language].downloadResume}
        </button>
      </div>
    </div>
  );
};

export default CandidateDetail;