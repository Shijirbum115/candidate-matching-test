// src/utils/translations.js - Cleaned, structured, and deduplicated

const translations = {
  en: {
    // App and general
    appTitle: 'CANDIDATE MATCHING SYSTEM',
    welcomeMessage: 'Find the Perfect Candidate',
    welcomeDescription: 'Enter a position title and job description to find candidates that match your requirements.',

    // Search interface
    searchPlaceholder: 'Enter position title... (e.g., Data Engineer)',
    descriptionPlaceholder: 'Job Description (skills, requirements, etc.)',
    searchButton: 'Search Candidates',
    searchingCandidates: 'Searching for candidates...',
    showAdvanced: '+ Show Advanced Options',
    hideAdvanced: '- Hide Advanced Options',
    resultLimit: 'Result Limit',
    scoreThreshold: 'Score Threshold',

    // Filter labels
    skills: 'Skills',
    experience: 'Experience',
    industry: 'Industry',
    position: 'Position',
    education: 'Education',
    jobDescription: 'Job Description',

    // Filter placeholders
    skillsPlaceholder: 'Python, SQL, Machine Learning...',
    experiencePlaceholder: '3-5 years...',
    industryPlaceholder: 'Finance, Technology, Healthcare...',
    educationPlaceholder: "Bachelor's, Master's...",
    jobDescriptionPlaceholder: 'Responsibilities, requirements, duties...',

    // Search results
    matchingCandidates: 'Matching Candidates',
    noResults: 'No matching candidates found. Try adjusting your search criteria.',
    relevantExperiences: 'relevant experiences',
    candidates: 'candidates',

    // Enhanced candidate card labels
    totalExperience: 'Total Experience',
    currentCompany: 'Previous employer',
    currentPosition: 'Previously held role',
    educationField: 'Education',
    noData: 'No data available',
    unknown: 'Unknown field',

    // Candidate profile
    candidateProfile: 'Candidate Profile',
    matchScore: 'Match Score',
    score: 'Score',
    years: 'years',

    // Personal info
    id: 'ID',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    gender: 'Gender',
    birthdate: 'Birthdate',
    registrationNumber: 'Registration Number',

    // Sections
    relevantExperiencesTitle: 'Relevant Experiences',
    noEducationData: 'No education data available',
    noExperienceData: 'No experience data available',
    notAvailable: 'N/A',

    // Education specific
    degree: 'Degree',
    fieldOfStudy: 'Field of Study',
    profession: 'Profession',
    gpa: 'GPA',
    institution: 'Institution',
    school: 'School',
    startYear: 'Start Year',
    endYear: 'End Year',
    studyPeriod: 'Study Period',
    graduationYear: 'Graduation Year',
    graduated: 'Graduated',
    present: 'Present',
    to: 'to',
    from: 'from',
    unknownInstitution: 'Unknown Institution',
    unknownSchool: 'Unknown School',

    // Actions
    contactButton: 'Contact Candidate',
    viewOnCareers: 'View on Careers',
    downloadResume: 'Download Resume',
    reportButton: 'Report',
    addToSaved: 'Save Candidate',
    removeFromSaved: 'Unsave Candidate',

    // Navigation
    newSearch: 'New Search',
    showSearch: 'Show Search',
    hideSearch: 'Hide Search',

    // Saved searches
    savedSearches: 'Saved Searches',
    noSavedSearches: 'No saved searches yet',
    saveSearch: 'Save Search',
    searchNamePlaceholder: 'Enter a name for this search',
    pleaseEnterSearchName: 'Please enter a name for this search',

    // Misc
    enterPosition: 'Enter position and description to find matching candidates',
    searchingFor: 'Searching for',
    applicationHistory: 'Application History',
    appliedOn: 'Applied On',
    company: 'Company',
    department: 'Department',
    status: 'Status',
    noApplicationHistory: 'No application history available',
    applications: 'applications',
    totalApplications: 'Total Applications',
    loadingApplications: 'Loading application history...',
    unknownCompany: 'Unknown Company',
    unknownDepartment: 'Unknown Department',
    unknownPosition: 'Unknown Position'
  },

  mn: {
    // App and general
    appTitle: 'АЖИЛ ГОРИЛОГЧ ТАНИХ СИСТЕМ',
    welcomeMessage: 'Тохирох ажил горилогчийг олоорой',
    welcomeDescription: 'Албан тушаал болон ажлын тодорхойлолтыг оруулж, шаардлагад тань нийцэх ажил горилогчдыг хайна уу.',

    // Search interface
    searchPlaceholder: 'Албан тушаалын нэр... (ж.нь: Өгөгдлийн инженер)',
    descriptionPlaceholder: 'Ажлын байрны тодорхойлолт (ур чадвар, шаардлага гэх мэт)',
    searchButton: 'Ажил горилогчдыг хайх',
    searchingCandidates: 'Ажил горилогчдыг хайж байна...',
    showAdvanced: '+ Нэмэлт сонголтуудыг харуулах',
    hideAdvanced: '- Нэмэлт сонголтуудыг нуух',
    resultLimit: 'Үр дүнгийн хязгаар',
    scoreThreshold: 'Онооны босго',

    // Filter labels
    skills: 'Ур чадвар',
    experience: 'Туршлага',
    industry: 'Салбар',
    position: 'Албан тушаал',
    education: 'Боловсрол',
    jobDescription: 'Ажлын тодорхойлолт',

    // Filter placeholders
    skillsPlaceholder: 'Python, SQL, Машин сургалт...',
    experiencePlaceholder: '3-5 жил...',
    industryPlaceholder: 'Санхүү, Технологи, Эрүүл мэнд...',
    educationPlaceholder: 'Бакалавр, Магистр...',
    jobDescriptionPlaceholder: 'Үүрэг, шаардлага, ажлын даалгавар...',

    // Search results
    matchingCandidates: 'Тохирох ажил горилогчид',
    noResults: 'Тохирох ажил горилогч олдсонгүй. Хайлтын шалгуураа өөрчилнө үү.',
    relevantExperiences: 'холбогдох туршлага',
    candidates: 'ажил горилогч',

    // Enhanced candidate card labels
    totalExperience: 'Нийт туршлага',
    currentCompany: 'Сүүлд ажилласан компани',
    currentPosition: 'Сүүлд ажилласан албан тушаал',
    educationField: 'Боловсрол',
    noData: 'Мэдээлэл байхгүй',
    unknown: 'Тодорхойгүй салбар',

    // Candidate profile
    candidateProfile: 'Ажил горилогчийн профайл',
    matchScore: 'Тохирлын оноо',
    score: 'Оноо',
    years: 'жил',

    // Personal info
    id: 'ID',
    name: 'Нэр',
    email: 'И-мэйл',
    phone: 'Утас',
    gender: 'Хүйс',
    birthdate: 'Төрсөн огноо',
    registrationNumber: 'Регистрийн дугаар',

    // Sections
    relevantExperiencesTitle: 'Холбогдох туршлагууд',
    noEducationData: 'Боловсролын мэдээлэл байхгүй',
    noExperienceData: 'Туршлагын мэдээлэл байхгүй',
    notAvailable: 'Байхгүй',

    // Education specific
    degree: 'Зэрэг',
    fieldOfStudy: 'Мэргэжил',
    profession: 'Мэргэжил',
    gpa: 'Голч дүн',
    institution: 'Их сургууль',
    school: 'Сургууль',
    startYear: 'Элссэн жил',
    endYear: 'Төгссөн жил',
    studyPeriod: 'Суралцсан хугацаа',
    graduationYear: 'Төгсөлтийн жил',
    graduated: 'Төгссөн',
    present: 'одоо хүртэл',
    to: 'оноос',
    from: 'оноос',
    unknownInstitution: 'Тодорхойгүй сургууль',
    unknownSchool: 'Тодорхойгүй сургууль',

    // Actions
    contactButton: 'Ажил горилогчтой холбогдох',
    viewOnCareers: 'Careers дээр үзэх',
    downloadResume: 'Анкет татах',
    reportButton: 'Мэдээлэх',
    addToSaved: 'Ажил горилогчийг хадгалах',
    removeFromSaved: 'Хадгалснаас хасах',

    // Navigation
    newSearch: 'Шинэ хайлт',
    showSearch: 'Хайлтыг харуулах',
    hideSearch: 'Хайлтыг нуух',

    // Saved searches
    savedSearches: 'Хадгалсан хайлтууд',
    noSavedSearches: 'Хадгалсан хайлт алга байна',
    saveSearch: 'Хайлтыг хадгалах',
    searchNamePlaceholder: 'Энэ хайлтад нэр оруулна уу',
    pleaseEnterSearchName: 'Энэ хайлтад нэр оруулна уу',

    // Misc
    enterPosition: 'Тохирох ажил горилогчдыг олохын тулд албан тушаал болон тодорхойлолтыг оруулна уу',
    searchingFor: 'Хайж байна',
    applicationHistory: 'Өргөдлийн түүх',
    appliedOn: 'Өргөдөл гаргасан огноо',
    company: 'Компани',
    department: 'Хэлтэс',
    status: 'Төлөв',
    noApplicationHistory: 'Өргөдлийн түүх байхгүй',
    applications: 'өргөдөл',
    totalApplications: 'Нийт өргөдөл',
    loadingApplications: 'Өргөдлийн түүх ачааллаж байна...',
    unknownCompany: 'Тодорхойгүй компани',
    unknownDepartment: 'Тодорхойгүй хэлтэс',
    unknownPosition: 'Тодорхойгүй албан тушаал'
  }
};

export default translations;
