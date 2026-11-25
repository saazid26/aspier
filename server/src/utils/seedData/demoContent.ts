const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (character) => ({
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;'
}[character] || character));

export function makeDemoCover(_title?: string): string {
  // STRICT: Do not generate dummy "ASPIER • ILLUSTRATIVE ART" graphics.
  return '';
}

export function makeDemoAvatar(_initials?: string): string {
  // STRICT: Do not generate dummy avatar graphics. Client displays standard UI initials fallback.
  return '';
}

const sampleProject = (
  category: 'ongoing' | 'past' | 'future' | 'present',
  title: string,
  slug: string,
  wingSlug: string,
  abstract: string,
  methods: string,
  objectives: string[],
  index: number,
  doiUrl?: string
) => {
  const normCategory = (category === 'present' || category === 'ongoing') ? 'ongoing' : category;
  const paperUrl = doiUrl || (normCategory === 'past' ? 'https://doi.org/10.1016/j.envres.2024.118942' : '');
  return {
    category: normCategory,
    title,
    slug,
    wingSlug,
    abstract: `<p>${abstract}</p>`,
    content: `<p><strong>ASPIER Research Initiative.</strong> ${abstract}</p><p>${methods}</p><p>This project connects rigorous empirical methods, field observations, and open data practices across ASPIER academic wings.</p>`,
    objectives: `<ul>${objectives.map((objective) => `<li>${objective}</li>`).join('')}</ul>`,
    publicationUrl: paperUrl,
    doiUrl: paperUrl,
    showReadPaperButton: Boolean(paperUrl && (normCategory === 'past')),
    status: 'published' as const,
    authors: ['ASPIER Research Wing Group'],
    supervisors: ['ASPIER Senior Research Supervisors'],
    publishedAt: new Date(Date.UTC(2025, (index % 12), 15)),
    featured: normCategory === 'ongoing',
    sampleData: true,
    coverImage: makeDemoCover(title)
  };
};

export const demoResearch = [
  // 1. Wings of Aeronautical Engineering & UAV Systems
  sampleProject('present', 'Small-UAV Surveys for Riparian Habitat Change', 'sample-uav-riparian-habitat', 'aeronautical-engineering-uav-systems', 'An investigation of responsible UAV surveys for documenting vegetation and bank change along river corridors.', 'The protocol combines repeatable flight planning, ground observations, and image-derived indicators while following applicable aviation and field-safety requirements.', ['Design a repeatable, low-impact survey protocol.', 'Compare image indicators with field observations.', 'Document safety and environmental safeguards.'], 1),
  sampleProject('past', 'Low-Altitude Micro-UAV Telemetry and Aerodynamic Efficiency in Riverine Corridors', 'sample-uav-aerodynamics-telemetry', 'aeronautical-engineering-uav-systems', 'A retrospective study evaluating autonomous flight stability, wind-shear resilience, and sensor payload power consumption during low-altitude riparian monitoring missions.', 'Multi-sensor telemetry was logged across 120 river transect flights and evaluated against aerodynamic wind-tunnel benchmarks.', ['Evaluate fixed-wing vs multirotor flight stability in river valleys.', 'Optimize avionics power profiles under varying crosswinds.', 'Publish open telemetry dataset for micro-UAV stability.'], 2, 'https://doi.org/10.1016/j.paerosci.2023.100912'),
  sampleProject('future', 'Autonomous Solar-Powered High-Altitude UAVs for Environmental Surveillance', 'sample-solar-uav-surveillance', 'aeronautical-engineering-uav-systems', 'A proposed framework designing ultralight composite UAV platforms with embedded solar arrays for multi-day non-stop atmospheric and biodiversity observation.', 'The project designs carbon-composite wing spars, MPPT solar controllers, and gliding autopilot profiles for continuous diurnal-nocturnal cycles.', ['Prototype high-efficiency solar wing integration.', 'Model energy balance for continuous 48-hour flight.', 'Test autonomous thermal-soaring glide paths.'], 3),

  // 2. Wings of Planetary Science & Astrobiology
  sampleProject('present', 'Spectral Characterization of Mineral Signatures in Extreme Terrestrial Analogs', 'sample-spectral-mineral-signatures', 'planetary-science-astrobiology', 'In-situ reflectance spectroscopy analyzing hyper-arid and hypersaline mineral crusts to benchmark extraterrestrial orbital imaging spectrometers.', 'Diffuse reflectance spectrometry (350-2500 nm) was coupled with X-ray diffraction to identify biomarker mineral associations.', ['Catalogue diagnostic SWIR absorption bands in sulfate crusts.', 'Compare laboratory spectra with orbital hyperspectral datasets.', 'Establish spectral library of extreme analog minerals.'], 4),
  sampleProject('past', 'Comparative Analysis of Martian Regolith Simulants and Extreme Biota Survival', 'sample-martian-regolith-biota', 'planetary-science-astrobiology', 'An experimental evaluation of microbial desiccation tolerance and metabolic dormancy under simulated Martian atmospheric pressures and UV flux.', 'Endolithic cyanobacteria and halophilic archaea were cultured in MGS-1 simulant under anoxic CO2 environments at 600 Pa.', ['Quantify post-irradiation viability of halophilic isolates.', 'Assess regolith perchlorate toxicity thresholds.', 'Publish open protocols for environmental simulant testing.'], 5, 'https://doi.org/10.1089/ast.2023.0114'),
  sampleProject('future', 'Planetary Analog Soils: An Open Remote-Sensing Framework', 'sample-planetary-analog-soils', 'planetary-science-astrobiology', 'A proposed sample initiative to compare Earth analog environments using open geospatial observations and carefully documented field metadata.', 'The concept links remote sensing, planetary geology, and astrobiology while distinguishing testable hypotheses from exploratory interpretation.', ['Define candidate analog environments and selection criteria.', 'Integrate field metadata with open imagery.', 'Publish a reusable, uncertainty-aware dataset structure.'], 6),

  // 3. Wings of Hydrology & Atmospheric Physics
  sampleProject('present', 'Coupled Hydro-Atmospheric Dynamics of Flash Floods in River Basins', 'sample-flash-flood-hydrodynamics', 'hydrology-atmospheric-physics', 'Developing real-time hydrodynamic catchment models driven by localized doppler precipitation radar and satellite rainfall estimates.', 'Hydrological routing was integrated with high-resolution digital elevation models to simulate peak discharge timing.', ['Coupled numerical weather forecasts with 2D hydrodynamic flow.', 'Validate inundation depth against telemetric river gauge stations.', 'Deliver 6-hour advance warning simulations for vulnerable reaches.'], 7),
  sampleProject('past', 'Reproducible Wetland Classification with Multispectral Data', 'sample-wetland-classification', 'hydrology-atmospheric-physics', 'A fictional sample publication describing a transparent workflow for classifying seasonal wetland extent.', 'The demonstration emphasizes documented training data, independent validation, and comparable reporting across seasonal observations.', ['Document each data-preparation step.', 'Evaluate classification with independent samples.', 'Report uncertainty and transfer limits.'], 8, 'https://doi.org/10.1029/2023WR034821'),
  sampleProject('future', 'An Open Coastal Resilience Digital Twin', 'sample-coastal-resilience-twin', 'hydrology-atmospheric-physics', 'A concept-stage sample project for connecting hydrology, coastal observations, and scenario analysis in an accessible planning tool.', 'The proposed work would prioritize open standards, transparent model assumptions, and community review of decision-support outputs.', ['Specify minimum trusted inputs and metadata.', 'Compare scenario assumptions with local knowledge.', 'Design clear limits and responsible-use guidance.'], 9),

  // 4. Wings of Geospatial Intelligence & Remote Sensing
  sampleProject('present', 'Monsoon Flood Exposure Mapping from Open Satellite Observations', 'sample-monsoon-flood-mapping', 'geospatial-intelligence-remote-sensing', 'A sample project combining open Earth-observation data and community knowledge to map seasonal flood exposure in river-adjacent settlements.', 'The illustrative workflow compares optical and radar observations, validates mapped water extent against documented local events, and reports uncertainty rather than a single definitive risk score.', ['Build a reproducible seasonal flood-mapping workflow.', 'Compare satellite-derived exposure with community observations.', 'Publish clear uncertainty and data-quality notes.'], 10),
  sampleProject('past', 'Urban Heat Exposure and Tree Canopy: A Sample Rajshahi Case Study', 'sample-urban-heat-canopy', 'geospatial-intelligence-remote-sensing', 'A sample retrospective analysis of how urban tree cover and built form relate to daytime heat exposure.', 'This example combines public land-cover data and temperature observations to demonstrate transparent spatial sampling and sensitivity analysis.', ['Compare heat indicators across land-cover types.', 'Describe limitations in temporal and spatial resolution.', 'Share reproducible analysis steps.'], 11, 'https://doi.org/10.1016/j.envres.2024.118942'),
  sampleProject('future', 'Satellite-Derived Urban Subsidence and Groundwater Depletion Modeling', 'sample-satellite-urban-subsidence', 'geospatial-intelligence-remote-sensing', 'A planned multi-temporal InSAR study integrating persistent scatterer interferometry with hydrological well logs to forecast delta subsidence risks.', 'Synthetic aperture radar interferometry tracks millimeter-scale vertical surface displacement in dense urban zones.', ['Process Sentinel-1 SLC time series for vertical ground motion.', 'Correlate seasonal subsidence with piezometric head decline.', 'Map infrastructure vulnerability hot-spots.'], 12),

  // 5. Wings of Geomicrobiology & Biogeology
  sampleProject('present', 'Microbial Bioweathering and Biomineralization in Deltaic Sediments', 'sample-microbial-bioweathering-sediments', 'geomicrobiology-biogeology', 'Investigating the catalytic roles of indigenous iron-reducing bacteria in mineral transformations and sediment stabilization along active river deltas.', 'Laboratory column micro-cosms were inoculated with Shewanella and Geobacter strains to monitor Fe(III) reduction and siderite precipitation.', ['Quantify authigenic mineral precipitation rates.', 'Characterize microbial biofilm formation on silts.', 'Identify biogeochemical drivers of sediment consolidation.'], 13),
  sampleProject('past', 'Deep Subsurface Microbial Communities in Arsenic-Bearing Aquifers', 'sample-subsurface-microbial-aquifers', 'geomicrobiology-biogeology', 'A published investigation into the taxonomic diversity and biogeochemical mobilization pathways of arsenic mediated by anaerobic prokaryotes.', 'Deep sediment cores (30-150m) were subjected to 16S rRNA gene amplicon sequencing and geochemical pore-water profiling.', ['Map vertical distribution of dissimilatory arsenate-respiring bacteria.', 'Assess correlation between organic carbon availability and As release.', 'Provide mechanistic basis for safe aquifer depth targeting.'], 14, 'https://doi.org/10.1038/s41522-023-00421-w'),
  sampleProject('future', 'Metagenomic Characterization of Deep-Sea Hydrothermal Microbial Networks', 'sample-hydrothermal-microbial-networks', 'geomicrobiology-biogeology', 'A prospective bioinformatics initiative reconstructing metabolic pathways of uncultivated Archaea from benthic extreme environments.', 'High-throughput metagenomic binning and genome-resolved functional annotation will illuminate novel sulfur-oxidizing enzymes.', ['Reconstruct metagenome-assembled genomes (MAGs) from vent chimneys.', 'Trace evolutionary divergence of chemosynthetic metabolic complexes.', 'Screen candidate biocatalysts for industrial sulfur conversion.'], 15),

  // 6. Wings of Environmental Chemistry & Toxicology
  sampleProject('present', 'Community Air-Quality Sensing for Public Health', 'sample-community-air-quality', 'environmental-chemistry-toxicology', 'A sample study of low-cost air-quality monitoring, calibration, and accessible reporting for urban communities.', 'The proposed demonstration pairs sensor co-location with reference instruments, metadata checks, and privacy-conscious neighborhood summaries.', ['Evaluate low-cost sensor drift and calibration.', 'Identify practical monitoring locations with community input.', 'Create readable, privacy-preserving reports.'], 16),
  sampleProject('past', 'Heavy Metal Bioaccumulation and Toxicokinetics in Deltaic Fish Species', 'sample-heavy-metal-bioaccumulation', 'environmental-chemistry-toxicology', 'Quantifying lead, cadmium, and chromium trophic transfer in estuarine aquatic food webs and calculating chronic dietary intake risks.', 'Atomic absorption spectroscopy and inductively coupled plasma mass spectrometry analyzed gill, liver, and muscle tissue burdens.', ['Determine bioaccumulation factors across trophic levels.', 'Evaluate histopathological biomarkers in target species.', 'Calculate hazard quotients for consumer population cohorts.'], 17, 'https://doi.org/10.1016/j.chemosphere.2023.138402'),
  sampleProject('future', 'Nanoplastic Adsorption Dynamics and Chemical Leaching in Aquatic Systems', 'sample-nanoplastic-adsorption-dynamics', 'environmental-chemistry-toxicology', 'Investigating surface charge interactions and hydrophobic organic contaminant sorption onto weathering microplastics in freshwater systems.', 'Dynamic light scattering and zeta potential tracking evaluate persistent organic pollutant desorption rates into aquatic biomes.', ['Model competitive adsorption kinetics of endocrine disruptors.', 'Determine temperature and salinity effects on chemical release.', 'Develop standardized ecotoxicity testing protocols.'], 18),

  // 7. Wings of Applied Biotechnology
  sampleProject('present', 'Bioengineered Extremophile Enzymes for Industrial Bioremediation', 'sample-extremophile-enzymes-bioremediation', 'applied-biotechnology', 'Engineering thermophilic bacterial laccases and peroxidases for the enzymatic degradation of synthetic azo dyes in textile wastewater.', 'Rational active-site mutagenesis and directed evolution produced variants with 4-fold higher catalytic turnover in alkaline effluent.', ['Isolate thermostable oxidoreductase genes from thermal springs.', 'Screen engineered variants for recalcitrant dye decolorization.', 'Design immobilized enzyme packed-bed reactor prototypes.'], 19),
  sampleProject('past', 'CRISPR-Assisted Genetic Enhancement for Salinity Tolerance in Coastal Crops', 'sample-crispr-salinity-tolerance', 'applied-biotechnology', 'Targeted knockout of negative osmotic regulators via CRISPR/Cas9 to improve seedling vigor and ion homeostasis in saline agricultural soils.', 'Multiplex gRNA expression vectors modulated vacuolar Na+/H+ antiporter expression, validating enhanced biomass under 150 mM NaCl.', ['Construct targeted ribonucleoprotein delivery protocols.', 'Screen edited lines for root elongation and chlorophyll retention.', 'Demonstrate non-transgenic stable inheritance in elite cultivars.'], 20, 'https://doi.org/10.1111/pbi.14120'),
  sampleProject('future', 'Cell-Free Synthetic Biology Frameworks for Rapid Field Environmental Diagnostics', 'sample-synthetic-biology-diagnostics', 'applied-biotechnology', 'Developing lyophilized paper-based biosensors powered by cell-free gene networks for point-of-need detection of pathogen DNA and chemical toxins.', 'Toehold riboswitches coupled with fluorogenic enzymatic reporters allow instrument-free visual readouts within 30 minutes.', ['Formulate shelf-stable room-temperature enzyme master mixes.', 'Engineer high-specificity RNA sensor modules for viral water contaminants.', 'Pilot robust field-deployable test strip formats.'], 21),

  // 8. Wings of Agricultural Sciences & Food Security
  sampleProject('present', 'Precision Nitrogen Management Using Multi-UAV Hyperspectral Imaging', 'sample-precision-nitrogen-hyperspectral', 'agricultural-sciences-food-security', 'Deploying high-resolution narrowband spectral indices to generate variable-rate fertilizer prescriptions and minimize nitrogen runoff.', 'UAV hyperspectral sweeps compute red-edge chlorophyll indices (NDRE) calibrated against leaf SPAD readings.', ['Correlate spectral signatures with plant nitrogen uptake kinetics.', 'Generate prescription raster maps for automated spreader equipment.', 'Demonstrate 22% reduction in fertilizer application with zero yield loss.'], 22),
  sampleProject('past', 'Climate-Resilient Rice Cultivars and Soil Moisture Dynamics Under Drought Stress', 'sample-climate-resilient-rice', 'agricultural-sciences-food-security', 'Assessing root architecture plasticity and physiological drought-escape mechanisms across indigenous cultivars in water-scarce agro-climatic zones.', 'Mini-rhizotron camera imaging tracked deep root branching and stomatal conductance through reproductive-stage water deficits.', ['Evaluate water-use efficiency metrics across 24 local landraces.', 'Identify quantitative trait loci linked to deep rooting angle.', 'Formulate regional seed distribution guidelines for drought resilience.'], 23, 'https://doi.org/10.1016/j.fcr.2023.109123'),
  sampleProject('future', 'Smart Biochar Soil Amendment Formulations for Resilient Agroecosystems', 'sample-smart-biochar-agroecosystems', 'agricultural-sciences-food-security', 'Designing nutrient-enriched pyrolyzed biomass matrices to enhance soil carbon sequestration and microbial water-retention capacity.', 'Engineered porous biochar carriers impregnated with mycorrhizal inoculants are evaluated for nutrient slow-release.', ['Optimize slow pyrolysis temperatures for maximum cation exchange.', 'Synthesize biological inoculant carriers with extended shelf stability.', 'Measure multi-year soil organic carbon stabilization in field plots.'], 24),

  // 9. Wings of Economic Geography & Resource Management
  sampleProject('present', 'Spatio-Temporal Patterns of Urban Growth and Critical Resource Depletion', 'sample-urban-growth-resource-depletion', 'economic-geography-resource-management', 'Employing spatial econometric models and satellite nighttime lights to evaluate land consumption rates and ecological buffer encroachment.', 'Geographically weighted regression analyzes urban fringe expansion relative to groundwater recharge zones and arable acreage.', ['Quantify urban footprint growth elasticity against demographic expansion.', 'Identify high-risk encroachment corridors over prime agricultural land.', 'Provide zoning boundary recommendations to regional planning bodies.'], 25),
  sampleProject('past', 'Economic Valuation of Ecosystem Services in Coastal Mangrove Forests', 'sample-ecosystem-services-valuation', 'economic-geography-resource-management', 'Applying contingent valuation and replacement cost methods to quantify storm-protection and nursery fisheries value in deltaic mangrove habitats.', 'Household willingness-to-pay surveys across 42 coastal villages were combined with wave attenuation hydrodynamic modeling.', ['Establish marginal protective value of mangrove barrier widths.', 'Quantify annual economic yield contribution to artisanal fisheries.', 'Develop institutional mechanisms for community payment for ecosystem services.'], 26, 'https://doi.org/10.1016/j.ecolecon.2023.107890'),
  sampleProject('future', 'Circular Resource Infrastructure and Spatial Equity in Developing Megacities', 'sample-circular-resource-spatial-equity', 'economic-geography-resource-management', 'Developing spatial multi-criteria decision frameworks for decentralized water recycling and solid waste valorization in urban peripheries.', 'Network analysis models transport costs, secondary raw material recovery hubs, and spatial equity metrics for informal sector workers.', ['Map material flow balances for post-consumer polymer waste.', 'Optimize geographic siting of decentralized sorting facilities.', 'Model socioeconomic welfare impacts on informal waste collector cooperatives.'], 27),

  // 10. Wings of Environmental Policy & Governance
  sampleProject('present', 'Transboundary Water Governance and Collaborative Environmental Frameworks', 'sample-transboundary-water-governance', 'environmental-policy-governance', 'Comparative institutional analysis of river basin treaty mechanisms, joint hydrological monitoring, and riparian conflict resolution protocols.', 'The framework assesses institutional resilience across shared international catchments under climate-induced discharge volatility.', ['Review dispute arbitration mechanisms in 15 global river basin compacts.', 'Evaluate effectiveness of joint telemetry data-sharing agreements.', 'Formulate equitable water-allocation treaty templates for riparian states.'], 28),
  sampleProject('past', 'Community-Centered Flood Risk Communication', 'sample-flood-risk-communication', 'environmental-policy-governance', 'A sample interdisciplinary paper on making flood-risk information useful, accessible, and accountable to local communities.', 'The illustrative design uses co-produced communication materials and a structured evaluation plan without claiming real field results.', ['Identify information needs with affected communities.', 'Test accessible formats and multilingual summaries.', 'Define an ethical, repeatable evaluation process.'], 29, 'https://doi.org/10.1080/17538963.2023.2201943'),
  sampleProject('future', 'Federated Environmental Monitoring for Shared Watersheds', 'sample-federated-watershed-monitoring', 'environmental-policy-governance', 'A future-facing sample concept for sharing environmental indicators across organizations without centralizing all source data.', 'The proposal explores governance, interoperable metadata, and privacy-preserving computation before any deployment or impact claim.', ['Map stakeholder and data-governance requirements.', 'Prototype interoperable environmental indicators.', 'Assess security, privacy, and operational trade-offs.'], 30)
];

const scholarSearch = (name: string) => `https://scholar.google.com/scholar?q=${encodeURIComponent(name)}`;
const researchGateSearch = (name: string) => `https://www.researchgate.net/search/publication?q=${encodeURIComponent(name)}`;

export const demoSupervisors = [
  { _id: '60d0fe4f5311236168a109f1', name: 'Dr. Amina Rahman', slug: 'sample-amina-rahman', wingSlug: 'geospatial-intelligence-remote-sensing', designation: 'Sample Research Supervisor · Environmental Data Science', affiliation: 'ASPIER Illustrative Research Network', bio: '<p>Illustrative demo profile. Research interests include trustworthy geospatial analysis, open environmental data, and inclusive research practice. Replace this sample biography and affiliation with verified details before publication.</p>', photo: makeDemoAvatar('AR'), educationalBackground: 'Sample profile: doctoral training in environmental data science; replace with verified qualifications.', researchInterests: ['Remote Sensing', 'Environmental Data', 'Research Reproducibility'], googleScholar: scholarSearch('Amina Rahman sample environmental data science'), researchGate: researchGateSearch('Amina Rahman sample environmental data science'), sampleData: true },
  { _id: '60d0fe4f5311236168a109f2', name: 'Dr. Ishan Mahmud', slug: 'sample-ishan-mahmud', wingSlug: 'hydrology-atmospheric-physics', designation: 'Sample Research Supervisor · Atmospheric Physics', affiliation: 'ASPIER Illustrative Research Network', bio: '<p>Illustrative demo profile focused on hydrology, atmospheric processes, and transparent climate-risk communication. Replace this sample biography and affiliation with verified details before publication.</p>', photo: makeDemoAvatar('IM'), educationalBackground: 'Sample profile: graduate training in atmospheric physics; replace with verified qualifications.', researchInterests: ['Hydrology', 'Climate Variability', 'Risk Communication'], googleScholar: scholarSearch('Ishan Mahmud sample atmospheric physics'), researchGate: researchGateSearch('Ishan Mahmud sample atmospheric physics'), sampleData: true },
  { _id: '60d0fe4f5311236168a109f3', name: 'Dr. Nafisa Karim', slug: 'sample-nafisa-karim', wingSlug: 'applied-biotechnology', designation: 'Sample Research Supervisor · Applied Biotechnology', affiliation: 'ASPIER Illustrative Research Network', bio: '<p>Illustrative demo profile covering responsible biotechnology, environmental microbiology, and open laboratory practice. Replace this sample biography and affiliation with verified details before publication.</p>', photo: makeDemoAvatar('NK'), educationalBackground: 'Sample profile: graduate training in applied biosciences; replace with verified qualifications.', researchInterests: ['Environmental Microbiology', 'Biotechnology', 'Research Ethics'], googleScholar: scholarSearch('Nafisa Karim sample biotechnology'), researchGate: researchGateSearch('Nafisa Karim sample biotechnology'), sampleData: true },
  { _id: '60d0fe4f5311236168a109f4', name: 'Prof. Rafiq Hasan', slug: 'sample-rafiq-hasan', wingSlug: 'environmental-policy-governance', designation: 'Sample Research Supervisor · Environmental Governance', affiliation: 'ASPIER Illustrative Research Network', bio: '<p>Illustrative demo profile exploring environmental policy, resource governance, and community-centered research. Replace this sample biography and affiliation with verified details before publication.</p>', photo: makeDemoAvatar('RH'), educationalBackground: 'Sample profile: graduate training in public policy; replace with verified qualifications.', researchInterests: ['Environmental Policy', 'Resource Management', 'Public Engagement'], googleScholar: scholarSearch('Rafiq Hasan sample environmental governance'), researchGate: researchGateSearch('Rafiq Hasan sample environmental governance'), sampleData: true }
];

export const demoFoundingMembers = [
  {
    _id: '60d0fe4f5311236168a109e1',
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
    _id: '60d0fe4f5311236168a109e2',
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
    _id: '60d0fe4f5311236168a109e3',
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
    _id: '60d0fe4f5311236168a109e4',
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
  { _id: '60d0fe4f5311236168a10a01', name: 'Nadia Tasnim', slug: 'sample-nadia-tasnim', cohort: 'Sample 2026', designation: 'Sample Young Scholar · Undergraduate', affiliation: 'ASPIER Illustrative Research Network', wingSlug: 'geospatial-intelligence-remote-sensing', bio: '<p>Illustrative student profile exploring satellite-derived land-cover change and responsible geospatial analysis. Replace the sample biography and academic details before publication.</p>', photo: makeDemoAvatar('NT'), educationalBackground: 'Sample profile: undergraduate study in geography and data science.', researchTopics: ['GIS', 'Satellite Imagery', 'Python'], sampleData: true },
  { _id: '60d0fe4f5311236168a10a02', name: 'Arman Kabir', slug: 'sample-arman-kabir', cohort: 'Sample 2026', designation: 'Sample Young Scholar · Undergraduate', affiliation: 'ASPIER Illustrative Research Network', wingSlug: 'aeronautical-engineering-uav-systems', bio: '<p>Illustrative student profile focused on safe UAV survey planning and environmental monitoring. Replace the sample biography and academic details before publication.</p>', photo: makeDemoAvatar('AK'), educationalBackground: 'Sample profile: undergraduate study in electrical and aerospace systems.', researchTopics: ['UAV Systems', 'Embedded Sensors', 'Field Safety'], sampleData: true },
  { _id: '60d0fe4f5311236168a10a03', name: 'Maliha Noor', slug: 'sample-maliha-noor', cohort: 'Sample 2025', designation: 'Sample Young Scholar · Master’s student', affiliation: 'ASPIER Illustrative Research Network', wingSlug: 'hydrology-atmospheric-physics', bio: '<p>Illustrative graduate profile examining hydrological data quality, seasonal change, and accessible risk information. Replace the sample biography and academic details before publication.</p>', photo: makeDemoAvatar('MN'), educationalBackground: 'Sample profile: graduate study in water resources and environmental science.', researchTopics: ['Hydrology', 'Climate Data', 'Risk Communication'], sampleData: true },
  { _id: '60d0fe4f5311236168a10a04', name: 'Tahmid Ahmed', slug: 'sample-tahmid-ahmed', cohort: 'Sample 2025', designation: 'Sample Young Scholar · Master’s student', affiliation: 'ASPIER Illustrative Research Network', wingSlug: 'environmental-chemistry-toxicology', bio: '<p>Illustrative graduate profile working on transparent environmental monitoring and responsible interpretation of exposure data. Replace the sample biography and academic details before publication.</p>', photo: makeDemoAvatar('TA'), educationalBackground: 'Sample profile: graduate study in environmental chemistry.', researchTopics: ['Air Quality', 'Environmental Chemistry', 'Data Visualization'], sampleData: true },
  { _id: '60d0fe4f5311236168a10a05', name: 'Sohana Islam', slug: 'sample-sohana-islam', cohort: 'Sample 2026', designation: 'Sample Young Scholar · Undergraduate', affiliation: 'ASPIER Illustrative Research Network', wingSlug: 'environmental-policy-governance', bio: '<p>Illustrative student profile interested in equitable environmental decisions and community-led research design. Replace the sample biography and academic details before publication.</p>', photo: makeDemoAvatar('SI'), educationalBackground: 'Sample profile: undergraduate study in public policy and human geography.', researchTopics: ['Environmental Policy', 'Community Research', 'Resource Governance'], sampleData: true }
];
