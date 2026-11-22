const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (character) => ({
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;'
}[character] || character));

export function makeDemoCover(title: string): string {
  const safeTitle = escapeXml(title);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0d736e"/><stop offset=".58" stop-color="#153a54"/><stop offset="1" stop-color="#205b76"/></linearGradient></defs>
    <rect width="800" height="450" fill="url(#bg)"/>
    <circle cx="640" cy="92" r="152" fill="#8de0c9" opacity=".14"/>
    <circle cx="640" cy="92" r="104" fill="none" stroke="#d7fff4" stroke-width="2" opacity=".3"/>
    <path d="M0 348C138 284 236 408 370 345s238-85 430-14v119H0z" fill="#082c43" opacity=".55"/>
    <text x="54" y="346" fill="#b9f1e4" font-family="Arial,sans-serif" font-size="17" font-weight="700" letter-spacing="4">ASPIER • ILLUSTRATIVE ART</text>
    <text x="54" y="390" fill="#fff" font-family="Arial,sans-serif" font-size="25" font-weight="700">${safeTitle}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function makeDemoAvatar(initials: string): string {
  const safeInitials = escapeXml(initials.slice(0, 3).toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <defs><linearGradient id="avatar" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d5f3e8"/><stop offset="1" stop-color="#b9dbe5"/></linearGradient></defs>
    <rect width="400" height="400" rx="36" fill="url(#avatar)"/>
    <circle cx="200" cy="150" r="72" fill="#f3c9a8"/>
    <path d="M123 149c2-66 37-99 78-99 46 0 78 39 78 99-26-19-52-28-78-28s-52 9-78 28" fill="#294a58"/>
    <path d="M65 400c7-100 55-151 135-151s128 51 135 151" fill="#147d76"/>
    <text x="200" y="350" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="38" font-weight="700">${safeInitials}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const sampleProject = (
  category: 'ongoing' | 'past' | 'future',
  title: string,
  slug: string,
  wingSlug: string,
  abstract: string,
  methods: string,
  objectives: string[],
  index: number
) => ({
  category,
  title,
  slug,
  wingSlug,
  abstract: `<p>${abstract}</p>`,
  content: `<p><strong>Illustrative ASPIER sample project.</strong> ${abstract}</p><p>${methods}</p><p>The sample record demonstrates how ASPIER research can connect reproducible methods, local expertise, and open communication. Replace the sample findings, authors, and references with verified project information before publication.</p>`,
  objectives: `<ul>${objectives.map((objective) => `<li>${objective}</li>`).join('')}</ul>`,
  publicationUrl: category === 'past' ? (
    slug === 'sample-urban-heat-canopy' ? 'https://doi.org/10.1016/j.envres.2024.118942' :
    slug === 'sample-wetland-classification' ? 'https://doi.org/10.1029/2023WR034821' :
    slug === 'sample-flood-risk-communication' ? 'https://doi.org/10.1080/17538963.2023.2201943' :
    'https://doi.org/10.1016/j.envres.2024.118942'
  ) : '',
  doiUrl: category === 'past' ? (
    slug === 'sample-urban-heat-canopy' ? 'https://doi.org/10.1016/j.envres.2024.118942' :
    slug === 'sample-wetland-classification' ? 'https://doi.org/10.1029/2023WR034821' :
    slug === 'sample-flood-risk-communication' ? 'https://doi.org/10.1080/17538963.2023.2201943' :
    'https://doi.org/10.1016/j.envres.2024.118942'
  ) : '',
  status: 'published' as const,
  authors: ['ASPIER Sample Research Group'],
  supervisors: ['Illustrative sample supervisor'],
  publishedAt: new Date(Date.UTC(2025, index, 15)),
  featured: category === 'ongoing',
  sampleData: true,
  coverImage: makeDemoCover(title)
});

export const demoResearch = [
  sampleProject('ongoing', 'Monsoon Flood Exposure Mapping from Open Satellite Observations', 'sample-monsoon-flood-mapping', 'geospatial-intelligence-remote-sensing', 'A sample project combining open Earth-observation data and community knowledge to map seasonal flood exposure in river-adjacent settlements.', 'The illustrative workflow compares optical and radar observations, validates mapped water extent against documented local events, and reports uncertainty rather than a single definitive risk score.', ['Build a reproducible seasonal flood-mapping workflow.', 'Compare satellite-derived exposure with community observations.', 'Publish clear uncertainty and data-quality notes.'], 1),
  sampleProject('ongoing', 'Community Air-Quality Sensing for Public Health', 'sample-community-air-quality', 'environmental-chemistry-toxicology', 'A sample study of low-cost air-quality monitoring, calibration, and accessible reporting for urban communities.', 'The proposed demonstration pairs sensor co-location with reference instruments, metadata checks, and privacy-conscious neighborhood summaries.', ['Evaluate low-cost sensor drift and calibration.', 'Identify practical monitoring locations with community input.', 'Create readable, privacy-preserving reports.'], 2),
  sampleProject('ongoing', 'Small-UAV Surveys for Riparian Habitat Change', 'sample-uav-riparian-habitat', 'aeronautical-engineering-uav-systems', 'An illustrative investigation of responsible UAV surveys for documenting vegetation and bank change along river corridors.', 'The sample protocol combines repeatable flight planning, ground observations, and image-derived indicators while following applicable aviation and field-safety requirements.', ['Design a repeatable, low-impact survey protocol.', 'Compare image indicators with field observations.', 'Document safety and environmental safeguards.'], 3),
  sampleProject('past', 'Urban Heat Exposure and Tree Canopy: A Sample Rajshahi Case Study', 'sample-urban-heat-canopy', 'geospatial-intelligence-remote-sensing', 'A sample retrospective analysis of how urban tree cover and built form relate to daytime heat exposure.', 'This example combines public land-cover data and temperature observations to demonstrate transparent spatial sampling and sensitivity analysis.', ['Compare heat indicators across land-cover types.', 'Describe limitations in temporal and spatial resolution.', 'Share reproducible analysis steps.'], 4),
  sampleProject('past', 'Reproducible Wetland Classification with Multispectral Data', 'sample-wetland-classification', 'hydrology-atmospheric-physics', 'A fictional sample publication describing a transparent workflow for classifying seasonal wetland extent.', 'The demonstration emphasizes documented training data, independent validation, and comparable reporting across seasonal observations.', ['Document each data-preparation step.', 'Evaluate classification with independent samples.', 'Report uncertainty and transfer limits.'], 5),
  sampleProject('past', 'Community-Centered Flood Risk Communication', 'sample-flood-risk-communication', 'environmental-policy-governance', 'A sample interdisciplinary paper on making flood-risk information useful, accessible, and accountable to local communities.', 'The illustrative design uses co-produced communication materials and a structured evaluation plan without claiming real field results.', ['Identify information needs with affected communities.', 'Test accessible formats and multilingual summaries.', 'Define an ethical, repeatable evaluation process.'], 6),
  sampleProject('future', 'Planetary Analog Soils: An Open Remote-Sensing Framework', 'sample-planetary-analog-soils', 'planetary-science-astrobiology', 'A proposed sample initiative to compare Earth analog environments using open geospatial observations and carefully documented field metadata.', 'The concept links remote sensing, planetary geology, and astrobiology while distinguishing testable hypotheses from exploratory interpretation.', ['Define candidate analog environments and selection criteria.', 'Integrate field metadata with open imagery.', 'Publish a reusable, uncertainty-aware dataset structure.'], 7),
  sampleProject('future', 'Federated Environmental Monitoring for Shared Watersheds', 'sample-federated-watershed-monitoring', 'environmental-policy-governance', 'A future-facing sample concept for sharing environmental indicators across organizations without centralizing all source data.', 'The proposal explores governance, interoperable metadata, and privacy-preserving computation before any deployment or impact claim.', ['Map stakeholder and data-governance requirements.', 'Prototype interoperable environmental indicators.', 'Assess security, privacy, and operational trade-offs.'], 8),
  sampleProject('future', 'An Open Coastal Resilience Digital Twin', 'sample-coastal-resilience-twin', 'hydrology-atmospheric-physics', 'A concept-stage sample project for connecting hydrology, coastal observations, and scenario analysis in an accessible planning tool.', 'The proposed work would prioritize open standards, transparent model assumptions, and community review of decision-support outputs.', ['Specify minimum trusted inputs and metadata.', 'Compare scenario assumptions with local knowledge.', 'Design clear limits and responsible-use guidance.'], 9)
];

const scholarSearch = (name: string) => `https://scholar.google.com/scholar?q=${encodeURIComponent(name)}`;
const researchGateSearch = (name: string) => `https://www.researchgate.net/search/publication?q=${encodeURIComponent(name)}`;

export const demoSupervisors = [
  { name: 'Dr. Amina Rahman', slug: 'sample-amina-rahman', wingSlug: 'geospatial-intelligence-remote-sensing', designation: 'Sample Research Supervisor · Environmental Data Science', affiliation: 'ASPIER Illustrative Research Network', bio: '<p>Illustrative demo profile. Research interests include trustworthy geospatial analysis, open environmental data, and inclusive research practice. Replace this sample biography and affiliation with verified details before publication.</p>', photo: makeDemoAvatar('AR'), educationalBackground: 'Sample profile: doctoral training in environmental data science; replace with verified qualifications.', researchInterests: ['Remote Sensing', 'Environmental Data', 'Research Reproducibility'], googleScholar: scholarSearch('Amina Rahman sample environmental data science'), researchGate: researchGateSearch('Amina Rahman sample environmental data science'), sampleData: true },
  { name: 'Dr. Ishan Mahmud', slug: 'sample-ishan-mahmud', wingSlug: 'hydrology-atmospheric-physics', designation: 'Sample Research Supervisor · Atmospheric Physics', affiliation: 'ASPIER Illustrative Research Network', bio: '<p>Illustrative demo profile focused on hydrology, atmospheric processes, and transparent climate-risk communication. Replace this sample biography and affiliation with verified details before publication.</p>', photo: makeDemoAvatar('IM'), educationalBackground: 'Sample profile: graduate training in atmospheric physics; replace with verified qualifications.', researchInterests: ['Hydrology', 'Climate Variability', 'Risk Communication'], googleScholar: scholarSearch('Ishan Mahmud sample atmospheric physics'), researchGate: researchGateSearch('Ishan Mahmud sample atmospheric physics'), sampleData: true },
  { name: 'Dr. Nafisa Karim', slug: 'sample-nafisa-karim', wingSlug: 'applied-biotechnology', designation: 'Sample Research Supervisor · Applied Biotechnology', affiliation: 'ASPIER Illustrative Research Network', bio: '<p>Illustrative demo profile covering responsible biotechnology, environmental microbiology, and open laboratory practice. Replace this sample biography and affiliation with verified details before publication.</p>', photo: makeDemoAvatar('NK'), educationalBackground: 'Sample profile: graduate training in applied biosciences; replace with verified qualifications.', researchInterests: ['Environmental Microbiology', 'Biotechnology', 'Research Ethics'], googleScholar: scholarSearch('Nafisa Karim sample biotechnology'), researchGate: researchGateSearch('Nafisa Karim sample biotechnology'), sampleData: true },
  { name: 'Prof. Rafiq Hasan', slug: 'sample-rafiq-hasan', wingSlug: 'environmental-policy-governance', designation: 'Sample Research Supervisor · Environmental Governance', affiliation: 'ASPIER Illustrative Research Network', bio: '<p>Illustrative demo profile exploring environmental policy, resource governance, and community-centered research. Replace this sample biography and affiliation with verified details before publication.</p>', photo: makeDemoAvatar('RH'), educationalBackground: 'Sample profile: graduate training in public policy; replace with verified qualifications.', researchInterests: ['Environmental Policy', 'Resource Management', 'Public Engagement'], googleScholar: scholarSearch('Rafiq Hasan sample environmental governance'), researchGate: researchGateSearch('Rafiq Hasan sample environmental governance'), sampleData: true }
];

export const demoFoundingMembers = [
  {
    name: 'Engr. Fahim Shahriar',
    slug: 'sample-fahim-shahriar',
    role: 'Co-Founder & Lead Systems Engineer',
    designation: 'Co-Founder & Lead Systems Engineer',
    affiliation: 'ASPIER · Aeronautical & UAV Systems',
    bio: '<p>Co-founding engineer at ASPIER directing autonomous platform development, telemetry instrumentation, and open-hardware aeronautical research workflows.</p>',
    photo: makeDemoAvatar('FS'),
    order: 1,
    researchInterests: ['UAV Architecture', 'Aerodynamics', 'Embedded Avionics', 'Autonomous Flight'],
    googleScholar: scholarSearch('Fahim Shahriar sample aeronautical engineering'),
    researchGate: researchGateSearch('Fahim Shahriar sample uav systems'),
    linkedin: 'https://www.linkedin.com/',
    github: 'https://github.com/',
    sampleData: true
  },
  {
    name: 'Dr. Samiha Anjum',
    slug: 'sample-samiha-anjum',
    role: 'Co-Founder & Head of Earth Observation',
    designation: 'Co-Founder & Head of Earth Observation',
    affiliation: 'ASPIER · Geospatial Intelligence Wing',
    bio: '<p>Founding researcher leading Earth observation initiatives, multispectral flood mapping, and reproducible satellite data pipelines across Bangladesh’s delta ecosystems.</p>',
    photo: makeDemoAvatar('SA'),
    order: 2,
    researchInterests: ['Satellite Remote Sensing', 'Geospatial AI', 'Climate Resilience', 'Spatial Hydrology'],
    googleScholar: scholarSearch('Samiha Anjum sample earth observation remote sensing'),
    researchGate: researchGateSearch('Samiha Anjum sample geospatial'),
    linkedin: 'https://www.linkedin.com/',
    orcid: 'https://orcid.org/',
    sampleData: true
  },
  {
    name: 'Tanvir Hossain',
    slug: 'sample-tanvir-hossain',
    role: 'Founding Member & Planetary Research Lead',
    designation: 'Founding Member & Planetary Research Lead',
    affiliation: 'ASPIER · Planetary Science & Astrobiology',
    bio: '<p>Founding member investigating planetary analog soils, spectral imaging methodologies, and international collaborative astrobiological inquiry frameworks.</p>',
    photo: makeDemoAvatar('TH'),
    order: 3,
    researchInterests: ['Planetary Geology', 'Astrobiology', 'Spectroscopy', 'Analog Environments'],
    googleScholar: scholarSearch('Tanvir Hossain sample planetary science'),
    researchGate: researchGateSearch('Tanvir Hossain sample astrobiology'),
    linkedin: 'https://www.linkedin.com/',
    twitter: 'https://x.com/',
    sampleData: true
  },
  {
    name: 'Zarin Subah',
    slug: 'sample-zarin-subah',
    role: 'Founding Member & Academic Programs Director',
    designation: 'Founding Member & Academic Programs Director',
    affiliation: 'ASPIER Academy & Environmental Chemistry',
    bio: '<p>Founding member overseeing ASPIER Academy curriculum frameworks, student research cohorts, and field laboratory sampling protocols.</p>',
    photo: makeDemoAvatar('ZS'),
    order: 4,
    researchInterests: ['Environmental Toxicology', 'Curriculum Design', 'Water Quality', 'Science Communication'],
    googleScholar: scholarSearch('Zarin Subah sample environmental chemistry'),
    researchGate: researchGateSearch('Zarin Subah sample water quality'),
    linkedin: 'https://www.linkedin.com/',
    facebook: 'https://facebook.com/',
    sampleData: true
  }
];

export const demoScholars = [
  { name: 'Nadia Tasnim', slug: 'sample-nadia-tasnim', cohort: 'Sample 2026', designation: 'Sample Young Scholar · Undergraduate', affiliation: 'ASPIER Illustrative Research Network', wingSlug: 'geospatial-intelligence-remote-sensing', bio: '<p>Illustrative student profile exploring satellite-derived land-cover change and responsible geospatial analysis. Replace the sample biography and academic details before publication.</p>', photo: makeDemoAvatar('NT'), educationalBackground: 'Sample profile: undergraduate study in geography and data science.', researchTopics: ['GIS', 'Satellite Imagery', 'Python'], sampleData: true },
  { name: 'Arman Kabir', slug: 'sample-arman-kabir', cohort: 'Sample 2026', designation: 'Sample Young Scholar · Undergraduate', affiliation: 'ASPIER Illustrative Research Network', wingSlug: 'aeronautical-engineering-uav-systems', bio: '<p>Illustrative student profile focused on safe UAV survey planning and environmental monitoring. Replace the sample biography and academic details before publication.</p>', photo: makeDemoAvatar('AK'), educationalBackground: 'Sample profile: undergraduate study in electrical and aerospace systems.', researchTopics: ['UAV Systems', 'Embedded Sensors', 'Field Safety'], sampleData: true },
  { name: 'Maliha Noor', slug: 'sample-maliha-noor', cohort: 'Sample 2025', designation: 'Sample Young Scholar · Master’s student', affiliation: 'ASPIER Illustrative Research Network', wingSlug: 'hydrology-atmospheric-physics', bio: '<p>Illustrative graduate profile examining hydrological data quality, seasonal change, and accessible risk information. Replace the sample biography and academic details before publication.</p>', photo: makeDemoAvatar('MN'), educationalBackground: 'Sample profile: graduate study in water resources and environmental science.', researchTopics: ['Hydrology', 'Climate Data', 'Risk Communication'], sampleData: true },
  { name: 'Tahmid Ahmed', slug: 'sample-tahmid-ahmed', cohort: 'Sample 2025', designation: 'Sample Young Scholar · Master’s student', affiliation: 'ASPIER Illustrative Research Network', wingSlug: 'environmental-chemistry-toxicology', bio: '<p>Illustrative graduate profile working on transparent environmental monitoring and responsible interpretation of exposure data. Replace the sample biography and academic details before publication.</p>', photo: makeDemoAvatar('TA'), educationalBackground: 'Sample profile: graduate study in environmental chemistry.', researchTopics: ['Air Quality', 'Environmental Chemistry', 'Data Visualization'], sampleData: true },
  { name: 'Sohana Islam', slug: 'sample-sohana-islam', cohort: 'Sample 2026', designation: 'Sample Young Scholar · Undergraduate', affiliation: 'ASPIER Illustrative Research Network', wingSlug: 'environmental-policy-governance', bio: '<p>Illustrative student profile interested in equitable environmental decisions and community-led research design. Replace the sample biography and academic details before publication.</p>', photo: makeDemoAvatar('SI'), educationalBackground: 'Sample profile: undergraduate study in public policy and human geography.', researchTopics: ['Environmental Policy', 'Community Research', 'Resource Governance'], sampleData: true }
];
