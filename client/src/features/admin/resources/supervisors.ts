export const supervisorsResource = {
  name: 'supervisors',
  title: 'Supervisors',
  endpoint: '/admin/supervisors',
  fields: [
    { name: 'name', label: 'Name' },
    { name: 'slug', label: 'Slug' },
    { name: 'designation', label: 'Designation' },
    { name: 'affiliation', label: 'University / institution' },
    { name: 'presentAddress', label: 'Present address', type: 'textarea' },
    { name: 'permanentAddress', label: 'Permanent address', type: 'textarea' },
    { name: 'educationalBackground', label: 'Educational background', type: 'richtext' },
    { name: 'researchGate', label: 'ResearchGate URL' },
    { name: 'googleScholar', label: 'Google Scholar URL' },
    { name: 'linkedin', label: 'LinkedIn URL' },
    { name: 'orcid', label: 'ORCID URL / ID' },
    { name: 'twitter', label: 'X (Twitter) URL' },
    { name: 'github', label: 'GitHub URL' },
    { name: 'facebook', label: 'Facebook URL' },
    { name: 'website', label: 'Personal / Institutional Website URL' },
    { name: 'bio', label: 'Biography', type: 'richtext' },
    { name: 'photo', label: 'Profile photo', type: 'image', imageHelp: 'Recommended: 400 × 400 px, 1:1 Square, Max 2MB', maxSizeMB: 2 },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'researchInterests', label: 'Research domains', type: 'array' },
    { name: 'sampleData', label: 'Illustrative sample profile', type: 'boolean' }
  ]
};
