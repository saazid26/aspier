import mongoose from 'mongoose';
import { demoResearch, demoScholars, demoSupervisors, demoFoundingMembers, makeDemoCover, makeDemoAvatar } from './seedData/demoContent.js';
import { RESEARCH_PAPER_WRITING_CLASSES } from './researchCourseCurriculum.js';

export const fallbackWings = [
  {
    _id: "60d0fe4f5311236168a109ca",
    name: "Wings of Aeronautical Engineering & UAV Systems",
    slug: "aeronautical-engineering-uav-systems",
    shortDescription: "Design, build, and study aircraft and unmanned aerial systems.",
    description: "Interdisciplinary research in aircraft design, flight systems, autonomous platforms, and responsible UAV applications.",
    disciplines: ["Aerospace Engineering", "Mechanical Engineering", "Robotics", "Electrical Engineering"],
    objectives: ["Advance accessible aeronautical research", "Develop safe and reliable UAV systems", "Connect engineering research to environmental monitoring"],
    order: 1,
    isActive: true,
    coverImage: "https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-1.webp"
  },
  {
    _id: "60d0fe4f5311236168a109cb",
    name: "Wings of Planetary Science & Astrobiology",
    slug: "planetary-science-astrobiology",
    shortDescription: "Investigate planets, planetary materials, and the origins of life.",
    description: "Research spanning planetary geology, astrophysics, theoretical models, and the conditions that support life.",
    disciplines: ["Astrophysics", "Planetary Geology", "Theoretical Physics", "Mathematics"],
    objectives: ["Study planetary formation and evolution", "Develop quantitative models of planetary environments", "Explore astrobiological questions through interdisciplinary research"],
    order: 2,
    isActive: true,
    coverImage: "https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-2.webp"
  },
  {
    _id: "60d0fe4f5311236168a109cc",
    name: "Wings of Hydrology & Atmospheric Physics",
    slug: "hydrology-atmospheric-physics",
    shortDescription: "Understand water systems and the physics of the atmosphere.",
    description: "Integrated observation and modeling of weather, water, oceans, and water-resource engineering.",
    disciplines: ["Meteorology", "Hydrology", "Oceanography", "Civil Engineering (Water Resources)"],
    objectives: ["Improve understanding of coupled water and atmospheric systems", "Support flood and drought risk assessment", "Inform resilient water-resource planning"],
    order: 3,
    isActive: true,
    coverImage: "https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-3.webp"
  },
  {
    _id: "60d0fe4f5311236168a109cd",
    name: "Wings of Geospatial Intelligence & Remote Sensing",
    slug: "geospatial-intelligence-remote-sensing",
    shortDescription: "Turn Earth observation and spatial data into actionable knowledge.",
    description: "Geospatial research combining GIS, computer vision, geography, and physical measurement.",
    disciplines: ["Geoinformatics (GIS)", "Computer Science (AI/Vision)", "Geography", "Physics"],
    objectives: ["Advance responsible geospatial intelligence", "Build reliable remote-sensing methods", "Apply spatial evidence to environmental challenges"],
    order: 4,
    isActive: true,
    coverImage: "https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-4.webp"
  },
  {
    _id: "60d0fe4f5311236168a109ce",
    name: "Wings of Geomicrobiology & Biogeology",
    slug: "geomicrobiology-biogeology",
    shortDescription: "Explore interactions between microorganisms, geology, and life-supporting systems.",
    description: "Research at the intersection of microbial systems, geological processes, bioinformatics, and geochemistry.",
    disciplines: ["Microbiology", "Geology", "Bioinformatics", "Geochemistry"],
    objectives: ["Understand microbial influence on geological processes", "Characterize biogeochemical cycles", "Develop computational approaches for environmental biology"],
    order: 5,
    isActive: true,
    coverImage: "https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-5.webp"
  },
  {
    _id: "60d0fe4f5311236168a109cf",
    name: "Wings of Environmental Chemistry & Toxicology",
    slug: "environmental-chemistry-toxicology",
    shortDescription: "Measure contaminants and understand their effects on ecosystems and health.",
    description: "Analytical and applied research into environmental pollutants, chemical processes, and toxicological impacts.",
    disciplines: ["Analytical Chemistry", "Chemical Engineering", "Toxicology", "Environmental Science"],
    objectives: ["Improve environmental contaminant detection", "Assess chemical risks to ecosystems and communities", "Support evidence-based pollution prevention"],
    order: 6,
    isActive: true,
    coverImage: "https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-6.webp"
  },
  {
    _id: "60d0fe4f5311236168a109d0",
    name: "Wings of Applied Biotechnology",
    slug: "applied-biotechnology",
    shortDescription: "Apply biological innovation to environmental and societal needs.",
    description: "Research combining biotechnology, genetics, molecular biology, and pharmaceutical science.",
    disciplines: ["Biotechnology", "Genetic Engineering", "Molecular Biology", "Pharmacy"],
    objectives: ["Translate biological discovery into useful applications", "Promote responsible genetic and molecular research", "Develop interdisciplinary biotechnology capabilities"],
    order: 7,
    isActive: true,
    coverImage: "https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-7.webp"
  },
  {
    _id: "60d0fe4f5311236168a109d1",
    name: "Wings of Agricultural Sciences & Food Security",
    slug: "agricultural-sciences-food-security",
    shortDescription: "Strengthen sustainable agriculture and resilient food systems.",
    description: "Research spanning crop science, soils, agricultural engineering, and food technology.",
    disciplines: ["Agronomy", "Soil Science", "Agricultural Engineering", "Food Technology"],
    objectives: ["Improve sustainable agricultural productivity", "Strengthen soil and crop resilience", "Support safe and reliable food systems"],
    order: 8,
    isActive: true,
    coverImage: "https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-8.webp"
  },
  {
    _id: "60d0fe4f5311236168a109d2",
    name: "Wings of Economic Geography & Resource Management",
    slug: "economic-geography-resource-management",
    shortDescription: "Study the spatial distribution, use, and governance of resources.",
    description: "Interdisciplinary analysis connecting economics, cities, human geography, and data science.",
    disciplines: ["Economics", "Urban Planning", "Human Geography", "Data Science"],
    objectives: ["Analyze equitable and sustainable resource allocation", "Develop data-informed urban and regional planning", "Understand economic and human dimensions of environmental change"],
    order: 9,
    isActive: true,
    coverImage: "https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-9.webp"
  },
  {
    _id: "60d0fe4f5311236168a109d3",
    name: "Wings of Environmental Policy & Governance",
    slug: "environmental-policy-governance",
    shortDescription: "Develop fair, effective approaches to environmental decision-making.",
    description: "Research on public policy, institutions, environmental law, and the social dimensions of governance.",
    disciplines: ["Public Policy", "Sociology", "Environmental Law", "Political Science"],
    objectives: ["Connect environmental evidence with practical policy", "Strengthen inclusive and accountable governance", "Evaluate legal and institutional responses to environmental challenges"],
    order: 10,
    isActive: true,
    coverImage: "https://res.cloudinary.com/w9zgpjap/image/upload/aspier/wings/wing-10.webp"
  }
];

export const fallbackSettings = {
  siteName: "ASPIER",
  siteTitle: "ASPIER: Aeronautical, Spatial, Planetary Institute for Environmental Research",
  browserTabTitle: "ASPIER",
  aspierLogoUrl: "/aspier-logo.png",
  academyLogoUrl: "/aspier-academy-logo.png",
  faviconUrl: "/favicon.ico",
  heroTitle: "Research for our planet and beyond",
  heroSubtitle: "The Aeronautical, Spatial, Planetary Institute for Environmental Research advances discovery across Earth and space.",
  heroCtaText: "Explore wings",
  heroCtaLink: "/wings",
  heroSecondaryCtaText: "Visit academy",
  heroSecondaryCtaLink: "/academy",
  missionHeadline: "Rigorous inquiry, shared progress.",
  missionText: "We connect disciplines, support emerging researchers, and turn knowledge into practical public impact.",
  teamPreviewEyebrow: "ASPIER Team",
  teamPreviewTitle: "Supervisors & Young Scholars",
  teamPreviewBannerHeadline: "Research guidance, collaborative discovery",
  teamPreviewBannerSubtext: "Meet the academic leaders and emerging researchers advancing work across our ten wings.",
  statWings: "10",
  statWingsLabel: "Academic wings",
  statDomains: "25+",
  statDomainsLabel: "Research domains",
  statTracks: "3",
  statTracksLabel: "Academy tracks",
  statAccess: "24/7",
  statAccessLabel: "Digital access",
  bottomCtaEyebrow: "Explore ASPIER",
  bottomCtaHeadline: "Discover research that moves forward",
  bottomCtaText: "Explore research",
  bottomCtaLink: "/research",
  footerCopyright: "ASPIER — Aeronautical, Spatial, Planetary Institute for Environmental Research · © 2026",
  contactEmail: "contact@aspier.org",
  contactPhone: "+880 1603-012448",
  address: "Rajshahi / Dhaka, Bangladesh",
  founderName: "Md Saazid Bin Saif",
  founderTitle: "Founder, ASPIER",
  founderDescription: "Founder, ASPIER",
  founderBio: "<p>Founder of the Aeronautical, Spatial, Planetary Institute for Environmental Research (ASPIER), advancing collaborative inquiry, open data practices, and research education.</p>",
  founderResearchDomains: [
    "Aeronautical & Spatial Systems",
    "Environmental Research",
    "Remote Sensing & Geospatial Intelligence"
  ],
  founderGoogleScholarUrl: "https://scholar.google.com/",
  bkashNumber: "01603012448",
  nagadNumber: "01603012448",
  membershipFee: 0
};

const defaultDummyModules = [
  {
    _id: "mod-1",
    moduleNumber: 1,
    title: "Module 1: Foundations & Research Framing",
    description: "Formulating high-impact research questions, hypothesis framing, and academic standards.",
    week: "Weeks 1–2",
    lessons: [
      { _id: "les-1-1", title: "Session 1: Identifying Research Gaps & Problem Formulation" },
      { _id: "les-1-2", title: "Session 2: Formulating Hypotheses and Research Objectives" },
      { _id: "les-1-3", title: "Session 3: Ethical Considerations in Scientific Inquiry" }
    ]
  },
  {
    _id: "mod-2",
    moduleNumber: 2,
    title: "Module 2: Literature Review & Methodology",
    description: "Systematic literature search, synthesis matrices, and robust experimental/analytical design.",
    week: "Weeks 3–4",
    lessons: [
      { _id: "les-2-1", title: "Session 4: Advanced Scopus & Web of Science Literature Search" },
      { _id: "les-2-2", title: "Session 5: Building a Critical Literature Synthesis Matrix" },
      { _id: "les-2-3", title: "Session 6: Quantitative & Qualitative Methodology Design" }
    ]
  },
  {
    _id: "mod-3",
    moduleNumber: 3,
    title: "Module 3: Data Analysis & Tools",
    description: "Statistical modeling, reproducible analysis workflows, and effective visualization.",
    week: "Weeks 5–6",
    lessons: [
      { _id: "les-3-1", title: "Session 7: Data Preparation, Cleaning & Exploratory Analysis" },
      { _id: "les-3-2", title: "Session 8: Statistical Hypothesis Testing & Interpretation" },
      { _id: "les-3-3", title: "Session 9: Creating Publication-Quality Plots and Tables" }
    ]
  },
  {
    _id: "mod-4",
    moduleNumber: 4,
    title: "Module 4: Academic Writing & Publication",
    description: "Manuscript drafting (IMRaD), target journal selection, peer review response, and publication ethics.",
    week: "Weeks 7–8",
    lessons: [
      { _id: "les-4-1", title: "Session 10: Drafting Title, Abstract, and High-Impact Introduction" },
      { _id: "les-4-2", title: "Session 11: Results, Discussion, and Conclusion Mastery" },
      { _id: "les-4-3", title: "Session 12: Journal Selection, Cover Letters, and Peer Review Rebuttal" }
    ]
  }
];

export const fallbackCourses = [
  {
    _id: "60d0fe4f5311236168a109e1",
    title: "Higher Study-Oriented Research Paper Writing Course",
    slug: "higher-study-research-paper-writing",
    description: "Comprehensive guidance from foundational research concepts through publication in peer-reviewed journals.",
    duration: "15 Recorded Classes (Classes 0–14)",
    mode: "Online Recorded",
    deliveryMode: "Online Recorded",
    format: "Online Recorded",
    isRecorded: true,
    startDate: "Instant Access (Recorded)",
    targetAudience: "Undergraduate and graduate students preparing for higher studies abroad",
    price: 2000,
    level: "beginner",
    status: "published",
    thumbnail: makeDemoCover("Research Paper Writing"),
    classes: RESEARCH_PAPER_WRITING_CLASSES,
    curriculum: RESEARCH_PAPER_WRITING_CLASSES,
    modules: defaultDummyModules
  }
];

export const fallbackNews: any[] = [];

export { demoResearch, demoSupervisors, demoScholars, demoFoundingMembers, makeDemoAvatar };

declare global {
  var _fallbackApplications: any[] | undefined;
  var _fallbackResearchApplications: any[] | undefined;
}

export function getFallbackResearchApplications(): any[] {
  if (!global._fallbackResearchApplications) {
    global._fallbackResearchApplications = [];
  }
  return global._fallbackResearchApplications;
}

export function getFallbackApplications(): any[] {
  if (!global._fallbackApplications) {
    global._fallbackApplications = [];
  }
  return global._fallbackApplications;
}

const wingIdMap = new Map(fallbackWings.map((w) => [w.slug, w._id]));

export const fallbackResearchList: any[] = [];

export function getFallbackWings(): any[] {
  if (!(global as any)._fallbackWings) {
    (global as any)._fallbackWings = [...fallbackWings];
  }
  return (global as any)._fallbackWings;
}

export function addOrUpdateFallbackWing(wing: any): any {
  const wings = getFallbackWings();
  const id = wing._id || wing.id || `wing-${Date.now()}`;
  const idx = wings.findIndex((w) => w._id === id || w.slug === wing.slug);
  const updated = { ...wing, _id: id };
  if (idx >= 0) {
    wings[idx] = { ...wings[idx], ...updated };
  } else {
    wings.push(updated);
  }
  return updated;
}

export function deleteFallbackWing(id: string): void {
  const wings = getFallbackWings();
  const idx = wings.findIndex((w) => w._id === id || w.slug === id);
  if (idx >= 0) wings.splice(idx, 1);
}

export function getFallbackResearch(): any[] {
  if (!(global as any)._fallbackResearch) {
    (global as any)._fallbackResearch = [...fallbackResearchList];
  }
  return (global as any)._fallbackResearch;
}

export function addOrUpdateFallbackResearch(item: any): any {
  const list = getFallbackResearch();
  const id = item._id || item.id || `research-${Date.now()}`;
  const idx = list.findIndex((r) => r._id === id || r.slug === item.slug);
  const updated = { ...item, _id: id };
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updated };
  } else {
    list.unshift(updated);
  }
  return updated;
}

export function deleteFallbackResearch(id: string): void {
  const list = getFallbackResearch();
  const idx = list.findIndex((r) => r._id === id || r.slug === id);
  if (idx >= 0) list.splice(idx, 1);
}

export function getFallbackFoundingMembers(): any[] {
  if (!(global as any)._fallbackFoundingMembers) {
    (global as any)._fallbackFoundingMembers = [...demoFoundingMembers].map((item: any, idx: number) => ({
      ...item,
      order: item.order ?? item.displayOrder ?? idx,
      displayOrder: item.displayOrder ?? item.order ?? idx
    }));
  }
  return ((global as any)._fallbackFoundingMembers as any[]).sort((a: any, b: any) => (a.order ?? a.displayOrder ?? 0) - (b.order ?? b.displayOrder ?? 0));
}

export function addOrUpdateFallbackFoundingMember(item: any): any {
  const list = getFallbackFoundingMembers();
  const id = item._id || item.id || new mongoose.Types.ObjectId().toString();
  const idx = list.findIndex((m) => m._id === id || m.slug === item.slug);
  const updated = { ...item, _id: id };
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updated };
  } else {
    list.push(updated);
  }
  return updated;
}

export function deleteFallbackFoundingMember(id: string): void {
  const list = getFallbackFoundingMembers();
  const idx = list.findIndex((m) => m._id === id || m.slug === id);
  if (idx >= 0) list.splice(idx, 1);
}

export function getFallbackSupervisors(): any[] {
  if (!(global as any)._fallbackSupervisors) {
    (global as any)._fallbackSupervisors = [...demoSupervisors].map((item: any, idx: number) => ({
      ...item,
      order: item.order ?? item.displayOrder ?? idx,
      displayOrder: item.displayOrder ?? item.order ?? idx
    }));
  }
  return ((global as any)._fallbackSupervisors as any[]).sort((a: any, b: any) => (a.order ?? a.displayOrder ?? 0) - (b.order ?? b.displayOrder ?? 0));
}

export function addOrUpdateFallbackSupervisor(item: any): any {
  const list = getFallbackSupervisors();
  const id = item._id || item.id || new mongoose.Types.ObjectId().toString();
  const idx = list.findIndex((s) => s._id === id || s.slug === item.slug);
  const updated = { ...item, _id: id };
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updated };
  } else {
    list.push(updated);
  }
  return updated;
}

export function deleteFallbackSupervisor(id: string): void {
  const list = getFallbackSupervisors();
  const idx = list.findIndex((s) => s._id === id || s.slug === id);
  if (idx >= 0) list.splice(idx, 1);
}

export function getFallbackScholars(): any[] {
  if (!(global as any)._fallbackScholars) {
    (global as any)._fallbackScholars = [...demoScholars].map((item: any, idx: number) => ({
      ...item,
      order: item.order ?? item.displayOrder ?? idx,
      displayOrder: item.displayOrder ?? item.order ?? idx
    }));
  }
  return ((global as any)._fallbackScholars as any[]).sort((a: any, b: any) => (a.order ?? a.displayOrder ?? 0) - (b.order ?? b.displayOrder ?? 0));
}

export function reorderFallbackItems(category: string, orderedIds: string[]): any[] {
  let list: any[];
  const cat = String(category).toLowerCase();
  if (cat.includes('founding')) list = getFallbackFoundingMembers();
  else if (cat.includes('sup')) list = getFallbackSupervisors();
  else list = getFallbackScholars();

  const idMap = new Map<string, number>();
  orderedIds.forEach((id, index) => {
    idMap.set(String(id), index);
  });

  list.forEach((item) => {
    const id = String(item._id || item.id || item.slug);
    if (idMap.has(id)) {
      const ord = idMap.get(id)!;
      item.order = ord;
      item.displayOrder = ord;
    }
  });

  list.sort((a, b) => {
    const ordA = a.order ?? a.displayOrder ?? 999;
    const ordB = b.order ?? b.displayOrder ?? 999;
    return ordA - ordB;
  });

  return list;
}

export function addOrUpdateFallbackScholar(item: any): any {
  const list = getFallbackScholars();
  const id = item._id || item.id || new mongoose.Types.ObjectId().toString();
  const idx = list.findIndex((sc) => sc._id === id || sc.slug === item.slug);
  const updated = { ...item, _id: id };
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updated };
  } else {
    list.push(updated);
  }
  return updated;
}

export function deleteFallbackScholar(id: string): void {
  const list = getFallbackScholars();
  const idx = list.findIndex((sc) => sc._id === id || sc.slug === id);
  if (idx >= 0) list.splice(idx, 1);
}



