export interface CourseClassItem {
  classNumber: number;
  title: string;
  topics: string[];
  videoUrl: string;
  youtubeVideoId: string;
  videoId?: string;
  duration?: string;
}

export const RESEARCH_PAPER_WRITING_CLASSES: CourseClassItem[] = [
  {
    classNumber: 0,
    title: 'Orientation Class',
    topics: ['Orientation Class'],
    videoUrl: 'https://youtu.be/ZTFKbqsAD0w',
    youtubeVideoId: 'ZTFKbqsAD0w',
    videoId: 'ZTFKbqsAD0w',
    duration: '45 mins'
  },
  {
    classNumber: 1,
    title: 'Research Initiation & Literature Review',
    topics: ['Topic 1: How to start a Research', 'Topic 2: Process of Literature Review'],
    videoUrl: 'https://youtu.be/9gkolmn67Yo',
    youtubeVideoId: '9gkolmn67Yo',
    videoId: '9gkolmn67Yo',
    duration: '60 mins'
  },
  {
    classNumber: 2,
    title: 'Real-Time Research Paper Training',
    topics: ['Topic 1: Real-Time Research Paper Training', 'Topic 2: Real-time hands-on training to start a new research'],
    videoUrl: 'https://youtu.be/RgUXGUeAbpE',
    youtubeVideoId: 'RgUXGUeAbpE',
    videoId: 'RgUXGUeAbpE',
    duration: '60 mins'
  },
  {
    classNumber: 3,
    title: 'Referencing, Literature Selection, Data & Research Questions',
    topics: [
      '1. Different types of Referencing',
      '2. Literature Review Process Selection',
      '3. Data Collection and Analysis',
      '4. Research question development'
    ],
    videoUrl: 'https://youtu.be/rFtYioQX8dE',
    youtubeVideoId: 'rFtYioQX8dE',
    videoId: 'rFtYioQX8dE',
    duration: '75 mins'
  },
  {
    classNumber: 4,
    title: 'Questionnaire Development (KII, Likert Scaling)',
    topics: ['Questionnaire Development (KII, Likert Scaling)'],
    videoUrl: 'https://youtu.be/cVAbhHYC-6c',
    youtubeVideoId: 'cVAbhHYC-6c',
    videoId: 'cVAbhHYC-6c',
    duration: '60 mins'
  },
  {
    classNumber: 5,
    title: 'Data Collection and Research Design',
    topics: ['Data Collection and Research Design'],
    videoUrl: 'https://youtu.be/Uwdr_Uq7_34',
    youtubeVideoId: 'Uwdr_Uq7_34',
    videoId: 'Uwdr_Uq7_34',
    duration: '60 mins'
  },
  {
    classNumber: 6,
    title: 'Primary Data Collection and Analysis',
    topics: ['Primary Data Collection and Analysis'],
    videoUrl: 'https://youtu.be/F49kH2d6yaM',
    youtubeVideoId: 'F49kH2d6yaM',
    videoId: 'F49kH2d6yaM',
    duration: '60 mins'
  },
  {
    classNumber: 7,
    title: 'Statistical & Time Series Analysis',
    topics: ['1. Statistical Analysis', '2. Time Series Analysis'],
    videoUrl: 'https://youtu.be/pjeR0Z-ql1A',
    youtubeVideoId: 'pjeR0Z-ql1A',
    videoId: 'pjeR0Z-ql1A',
    duration: '75 mins'
  },
  {
    classNumber: 8,
    title: 'Reference Management Tools & Academia Co-Scientist',
    topics: ['1. Reference Management Tools', '2. Uses of Academia Co-Scientist'],
    videoUrl: 'https://youtu.be/fB99ijLWGb4',
    youtubeVideoId: 'fB99ijLWGb4',
    videoId: 'fB99ijLWGb4',
    duration: '60 mins'
  },
  {
    classNumber: 9,
    title: 'Overleaf, LaTeX, Infographics Creation, Result Representation',
    topics: ['Overleaf, LaTeX, Infographics Creation, Result Representation'],
    videoUrl: 'https://youtu.be/JqxVouHfqO8',
    youtubeVideoId: 'JqxVouHfqO8',
    videoId: 'JqxVouHfqO8',
    duration: '70 mins'
  },
  {
    classNumber: 10,
    title: 'Data Interpretation and Visualization in Excel',
    topics: ['Data Interpretation and Visualization in Excel'],
    videoUrl: 'https://youtu.be/Ase7OKP8yFM',
    youtubeVideoId: 'Ase7OKP8yFM',
    videoId: 'Ase7OKP8yFM',
    duration: '60 mins'
  },
  {
    classNumber: 11,
    title: 'Basic Python Class',
    topics: ['Basic Python Class'],
    videoUrl: 'https://youtu.be/KQv-Vgp-5OU',
    youtubeVideoId: 'KQv-Vgp-5OU',
    videoId: 'KQv-Vgp-5OU',
    duration: '65 mins'
  },
  {
    classNumber: 12,
    title: 'Advance Python Class',
    topics: ['Advance Python Class'],
    videoUrl: 'https://youtu.be/VGyO6PQ_JZM',
    youtubeVideoId: 'VGyO6PQ_JZM',
    videoId: 'VGyO6PQ_JZM',
    duration: '75 mins'
  },
  {
    classNumber: 13,
    title: 'Remote Sensing, GEE & RS Normalization',
    topics: ['1. Introduction to Remote Sensing', '2. Introduction to GEE', '3. All types of RS Normalization'],
    videoUrl: '',
    youtubeVideoId: '',
    videoId: '',
    duration: '60 mins'
  },
  {
    classNumber: 14,
    title: 'Land Surface Temperature & LULC Supervised Classification using GEE',
    topics: ['1. Land Surface Temperature using GEE', '2. LULC supervised classification using GEE'],
    videoUrl: 'https://youtu.be/6zypRWbNC9A',
    youtubeVideoId: '6zypRWbNC9A',
    videoId: '6zypRWbNC9A',
    duration: '80 mins'
  }
];

export const RESEARCH_PAPER_WRITING_MODULES = [
  {
    moduleNumber: 1,
    title: 'Module 1: Orientation & Research Foundations (Classes 0–3)',
    description: 'Orientation, Research Initiation, Real-Time Paper Training, Referencing & Data Formulation.',
    week: 'Weeks 1–2',
    lessons: RESEARCH_PAPER_WRITING_CLASSES.slice(0, 4).map((c) => ({
      title: `Class ${c.classNumber}: ${c.title}`,
      duration: c.duration || '60 mins',
      videoId: c.youtubeVideoId,
      videoUrl: c.videoUrl,
      classNumber: c.classNumber,
      topics: c.topics,
      isFreePreview: c.classNumber === 0
    }))
  },
  {
    moduleNumber: 2,
    title: 'Module 2: Field Data, Questionnaires & Statistical Analysis (Classes 4–7)',
    description: 'Questionnaire Development (KII, Likert), Data Collection, Primary Analysis & Time Series.',
    week: 'Weeks 3–4',
    lessons: RESEARCH_PAPER_WRITING_CLASSES.slice(4, 8).map((c) => ({
      title: `Class ${c.classNumber}: ${c.title}`,
      duration: c.duration || '60 mins',
      videoId: c.youtubeVideoId,
      videoUrl: c.videoUrl,
      classNumber: c.classNumber,
      topics: c.topics,
      isFreePreview: false
    }))
  },
  {
    moduleNumber: 3,
    title: 'Module 3: Scientific Tools, Overleaf LaTeX & Visualization (Classes 8–10)',
    description: 'Reference Management, Overleaf LaTeX, Result Representation, and Excel Data Interpretation.',
    week: 'Weeks 5–6',
    lessons: RESEARCH_PAPER_WRITING_CLASSES.slice(8, 11).map((c) => ({
      title: `Class ${c.classNumber}: ${c.title}`,
      duration: c.duration || '60 mins',
      videoId: c.youtubeVideoId,
      videoUrl: c.videoUrl,
      classNumber: c.classNumber,
      topics: c.topics,
      isFreePreview: false
    }))
  },
  {
    moduleNumber: 4,
    title: 'Module 4: Programming, Remote Sensing & GEE Analysis (Classes 11–14)',
    description: 'Basic & Advanced Python, Remote Sensing Normalization, and LULC Supervised Classification with GEE.',
    week: 'Weeks 7–8',
    lessons: RESEARCH_PAPER_WRITING_CLASSES.slice(11, 15).map((c) => ({
      title: `Class ${c.classNumber}: ${c.title}`,
      duration: c.duration || '60 mins',
      videoId: c.youtubeVideoId,
      videoUrl: c.videoUrl,
      classNumber: c.classNumber,
      topics: c.topics,
      isFreePreview: false
    }))
  }
];

