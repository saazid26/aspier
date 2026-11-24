import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Upload,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { staticWings, staticResearch } from '../../lib/staticData';

type WingItem = {
  _id: string;
  name: string;
  slug: string;
  shortDescription?: string;
};

type ResearchProject = {
  _id: string;
  title: string;
  slug: string;
  wingId?: any;
  wingSlug?: string;
  category?: 'past' | 'present' | 'ongoing' | 'future';
  status?: string;
};

export function ResearchMateApply() {
  const [searchParams] = useSearchParams();

  const initialWingParam = searchParams.get('wing') || '';
  const initialProjectParam = searchParams.get('project') || '';

  // 1. Fetch remote wings (fallback to staticWings)
  const { data: remoteWings = [] } = useQuery({
    queryKey: ['wings'],
    queryFn: async () => (await api.get('/public/wings')).data.data as WingItem[],
    initialData: staticWings
  });
  const wings = remoteWings && remoteWings.length > 0 ? remoteWings : staticWings;

  // 2. Fetch remote research projects
  const { data: remoteResearch = [] } = useQuery({
    queryKey: ['research-all'],
    queryFn: async () => (await api.get('/public/research')).data.data as ResearchProject[],
    initialData: staticResearch as any[]
  });
  const allResearch = remoteResearch && remoteResearch.length > 0 ? remoteResearch : (staticResearch as any[]);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [occupation, setOccupation] = useState('');
  const [selectedWingSlug, setSelectedWingSlug] = useState('');
  const [selectedProjectTitle, setSelectedProjectTitle] = useState('');
  const [skills, setSkills] = useState('');
  const [statement, setStatement] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState<{
    applicationId: string;
    name: string;
    wingName: string;
    researchTitle: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isInitializedRef = useRef(false);
  const projectInitializedRef = useRef(false);

  // Initialize selected wing from URL param or default to first wing
  useEffect(() => {
    if (isInitializedRef.current || wings.length === 0) return;
    isInitializedRef.current = true;

    let targetWingSlug = wings[0]?.slug || '';
    if (initialWingParam) {
      const match = wings.find(
        (w) =>
          w.slug === initialWingParam ||
          w._id === initialWingParam ||
          w.name.toLowerCase() === initialWingParam.toLowerCase()
      );
      if (match) {
        targetWingSlug = match.slug;
      }
    }
    setSelectedWingSlug(targetWingSlug);
  }, [initialWingParam, wings]);

  // Compute available projects for the currently selected Wing (Present & Future only)
  const wingProjects = useMemo(() => {
    if (!selectedWingSlug) return [];
    const currentWing = wings.find((w) => w.slug === selectedWingSlug);
    if (!currentWing) return [];

    // Filter projects for this wing and exclude 'past'
    const matching = allResearch.filter((r) => {
      const isPast = r.category === 'past';
      if (isPast) return false;

      const wingId = typeof r.wingId === 'object' ? (r.wingId?._id || r.wingId?.slug) : r.wingId;
      const currentWingId = currentWing._id ? String(currentWing._id) : '';
      const matchesWing =
        (r.wingSlug && r.wingSlug === currentWing.slug) ||
        (wingId && (String(wingId) === currentWingId || String(wingId) === currentWing.slug));

      return matchesWing;
    });

    // If specific wing has no explicitly tagged projects in seed, include non-past general projects
    if (matching.length === 0) {
      return allResearch.filter((r) => r.category !== 'past');
    }
    return matching;
  }, [selectedWingSlug, wings, allResearch]);

  // Initial auto-select of target project from initialProjectParam or first available project
  useEffect(() => {
    if (projectInitializedRef.current || wingProjects.length === 0) return;
    projectInitializedRef.current = true;

    if (initialProjectParam) {
      const found = wingProjects.find(
        (p) =>
          p.slug === initialProjectParam ||
          p.title.toLowerCase() === initialProjectParam.toLowerCase() ||
          p._id === initialProjectParam
      );
      if (found) {
        setSelectedProjectTitle(found.title);
        return;
      }
    }
    if (!selectedProjectTitle) {
      setSelectedProjectTitle(wingProjects[0].title);
    }
  }, [wingProjects, initialProjectParam, selectedProjectTitle]);

  // Handle explicit wing change by user: updates wing, re-filters, and auto-selects first matching project
  const handleWingChange = (newWingSlug: string) => {
    setSelectedWingSlug(newWingSlug);
    const currentWing = wings.find((w) => w.slug === newWingSlug);
    if (!currentWing) return;

    const matching = allResearch.filter((r) => {
      if (r.category === 'past') return false;
      const wingId = typeof r.wingId === 'object' ? (r.wingId?._id || r.wingId?.slug) : r.wingId;
      const currentWingId = currentWing._id ? String(currentWing._id) : '';
      return (
        (r.wingSlug && r.wingSlug === currentWing.slug) ||
        (wingId && (String(wingId) === currentWingId || String(wingId) === currentWing.slug))
      );
    });

    const available = matching.length > 0 ? matching : allResearch.filter((r) => r.category !== 'past');
    if (available.length > 0) {
      setSelectedProjectTitle(available[0].title);
    } else {
      setSelectedProjectTitle('');
    }
  };

  // Helper to validate and set PDF file
  const validateAndSetFile = (file: File) => {
    setPdfError('');
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setPdfError('Please upload a PDF document (.pdf) only.');
      setPdfFile(null);
      return false;
    }

    if (file.size > 8 * 1024 * 1024) {
      setPdfError('File size exceeds 8MB. Please upload a smaller PDF.');
      setPdfFile(null);
      return false;
    }

    setPdfFile(file);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPdfFile(null);
    setPdfError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const copyAppId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(true);
      toast.success('Application ID copied to clipboard!');
      setTimeout(() => setCopiedId(false), 2500);
    } catch {
      toast.error('Could not access clipboard.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim() || !email.trim() || !university.trim() || !department.trim() || !occupation.trim() || !skills.trim()) {
      setFormError('Please fill in all required fields marked with an asterisk (*).');
      toast.error('Please complete all required fields.');
      return;
    }

    if (!pdfFile) {
      setPdfError('CV / Resume upload in PDF format is required.');
      toast.error('Please upload your CV in PDF format.');
      return;
    }

    const currentWing = wings.find((w) => w.slug === selectedWingSlug);
    const chosenWingName = currentWing ? currentWing.name : selectedWingSlug;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('role', 'Research Mate');
      formData.append('name', fullName.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('phone', phone.trim());
      formData.append('university', university.trim());
      formData.append('department', department.trim());
      formData.append('occupation', occupation.trim());
      formData.append('wingName', chosenWingName);
      formData.append('wingSlug', selectedWingSlug);
      formData.append('researchTitle', selectedProjectTitle || 'Research Project Collaboration');
      formData.append('skills', skills.trim());
      formData.append('statement', statement.trim());
      formData.append('cv', pdfFile);

      const response = await api.post('/public/research-applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const resData = response.data.data;
      const appId = resData.applicationId || resData.id;

      // Save to session storage for instant lookup in Check Application
      try {
        const info = { applicationId: appId, email: email.trim().toLowerCase() };
        sessionStorage.setItem('aspier-last-research-application', JSON.stringify(info));
      } catch {
        // ignore
      }

      setSubmissionReceipt({
        applicationId: appId,
        name: fullName.trim(),
        wingName: chosenWingName,
        researchTitle: selectedProjectTitle || 'Research Project Collaboration'
      });

      toast.success('Research Mate application submitted successfully!');
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Failed to submit application. Please review your details.');
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentWing = wings.find((w) => w.slug === selectedWingSlug);

  if (submissionReceipt) {
    return (
      <main className="container section py-10 sm:py-16">
        <SEO
          title="Application Submitted | Research Mate"
          description="Your Research Mate application has been received."
        />
        <article className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-10 text-center space-y-6 box-border">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Stage 1 Application Received
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Thank you, {submissionReceipt.name}!
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto leading-relaxed">
              Your application to join <strong>{submissionReceipt.researchTitle}</strong> under the <strong>{submissionReceipt.wingName}</strong> as a <strong>Research Mate</strong> has been officially logged for faculty review.
            </p>
          </div>

          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200/90 rounded-xl text-left space-y-2.5 max-w-md mx-auto">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
              Your Unique Application ID
            </label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={submissionReceipt.applicationId}
                className="w-full font-mono text-base font-bold text-teal-900 bg-white border border-slate-300 rounded-lg px-3 py-2 select-all text-center"
              />
              <button
                type="button"
                onClick={() => copyAppId(submissionReceipt.applicationId)}
                className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-lg transition-colors ${
                  copiedId ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-900 text-white'
                }`}
              >
                {copiedId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedId ? 'Copied' : 'Copy ID'}
              </button>
            </div>
            <p className="text-xs text-slate-500 pt-1 leading-relaxed">
              Save this ID. Stage 1 application is <strong>100% free</strong>. You can check your application review progress anytime in the Check Application portal.
            </p>
          </div>

          <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-xl text-xs text-teal-950 text-left space-y-2">
            <p className="font-bold text-teal-950 text-sm">Next Steps &amp; Review Timeline:</p>
            <p>1. <strong>Faculty Review:</strong> Our academic wing committee reviews your submitted CV, background, and research alignment.</p>
            <p>2. <strong>Private Access Code:</strong> Once approved, you will receive an acceptance notification and your official Private Access Code.</p>
            <p>3. <strong>Stage 2 Verification:</strong> Enter your credentials in the Check Application portal to complete Stage 2 verification (BDT 1,000 project onboarding fee) and join the official project WhatsApp group.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('aspier-open-check-application', {
                  detail: { applicationId: submissionReceipt.applicationId }
                }));
              }}
              className="button button-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto font-semibold px-6 py-2.5 rounded-xl cursor-pointer"
            >
              Check Application Status <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to={selectedWingSlug ? `/wings/${selectedWingSlug}` : '/wings'}
              className="button button-secondary inline-flex items-center justify-center w-full sm:w-auto font-semibold px-5 py-2.5 rounded-xl"
            >
              Return to Academic Wing
            </Link>
          </div>
        </article>
      </main>
    );
  }

  return (
    <main className="container section py-10 sm:py-16">
      <SEO
        title="Apply as Research Mate | ASPIER Academic Wings"
        exact
        description="Apply to join active and emerging research projects across ASPIER's 10 Academic Wings as a Research Mate. Collaborate with leading supervisors and co-author scientific publications."
        keywords="ASPIER Research Mate, apply research mate, academic wings research, undergraduate researcher, scientific research collaboration"
        canonicalPath="/wings/apply-research"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Wings', path: '/wings' },
          { name: 'Apply Research Mate', path: '/wings/apply-research' }
        ]}
      />

      <div className="w-full max-w-3xl mx-auto box-border">
        {/* Header & Breadcrumb Hierarchy */}
        <div className="flex flex-col gap-2 mb-6">
          <Link
            to={selectedWingSlug ? `/wings/${selectedWingSlug}` : '/wings'}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1.5 transition-colors self-start"
          >
            ← Back to {currentWing ? currentWing.name : 'Academic Wing'}
          </Link>
          <span className="text-xs font-extrabold uppercase tracking-widest text-teal-600">
            ACADEMIC WINGS • COLLABORATIVE RESEARCH
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Apply to Join Research (Research Mate)
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
            Collaborate directly on active research projects, co-author publications, and work alongside ASPIER Supervisors and Scholars. Initial Stage 1 application is 100% free.
          </p>
        </div>

        {/* Form Card Container */}
        <form
          className="research-mate-form w-full max-w-3xl mx-auto rounded-2xl bg-white border border-slate-200/90 shadow-sm p-4 sm:p-6 lg:p-8 box-border flex flex-col"
          onSubmit={handleSubmit}
        >
          {/* Top Role Header Strip */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-3 p-3.5 sm:px-5 sm:py-3.5 rounded-xl bg-teal-50/70 border border-teal-100 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-teal-700 shrink-0" />
              <span className="text-sm sm:text-base font-bold text-slate-900">Research Mate</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 uppercase tracking-wider">
                Locked Role
              </span>
            </div>
            <span className="text-xs sm:text-sm font-medium text-teal-800">
              Project Collaborator Role
            </span>
          </div>

          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 font-medium mb-4">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Group 1 — Applicant Details (1-Col Mobile, 2-Col Desktop) */}
          <div className="mt-6 sm:mt-8 first:mt-0">
            <div className="pb-2.5 mb-4 border-b border-slate-200">
              <h2 className="form-section-title text-[15px] sm:text-base font-bold tracking-wide uppercase leading-snug text-[#134e4a] m-0">
                1. APPLICANT DETAILS
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Tariqul Islam"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full max-w-full min-w-0 box-border min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="email"
                  placeholder="e.g. tariqul@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full max-w-full min-w-0 box-border min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Phone / WhatsApp Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +880 1711-223344"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full max-w-full min-w-0 box-border min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  University / Institution <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. BUET, University of Dhaka, RUET..."
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="block w-full max-w-full min-w-0 box-border min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Department <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Mechanical Engineering, Physics, CSE..."
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="block w-full max-w-full min-w-0 box-border min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Occupation / Current Workplace <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 4th Year Student, Research Assistant"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="block w-full max-w-full min-w-0 box-border min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <p className="md:col-span-2 text-xs text-slate-500 -mt-1 sm:-mt-2">
                State your current job/role and organization, or your current study year and student status.
              </p>
            </div>
          </div>

          {/* Group 2 — Wing & Target Research Project */}
          <div className="mt-6 sm:mt-8">
            <div className="pb-2.5 mb-4 border-b border-slate-200">
              <h2 className="form-section-title text-[15px] sm:text-base font-bold tracking-wide uppercase leading-snug text-[#134e4a] m-0">
                2. WING &amp; TARGET RESEARCH PROJECT
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Preferred Academic Wing <span className="text-rose-500">*</span>
                </label>
                <select
                  className="block w-full max-w-full min-w-0 box-border min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 truncate"
                  value={selectedWingSlug}
                  onChange={(e) => handleWingChange(e.target.value)}
                  required
                >
                  {wings.map((w) => (
                    <option key={w.slug || w._id} value={w.slug}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Target Research Program / Project <span className="text-rose-500">*</span>
                </label>
                {wingProjects.length > 0 ? (
                  <select
                    className="block w-full max-w-full min-w-0 box-border min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 truncate"
                    value={selectedProjectTitle}
                    onChange={(e) => setSelectedProjectTitle(e.target.value)}
                    required
                  >
                    {wingProjects.map((p) => (
                      <option key={p._id || p.slug || p.title} value={p.title}>
                        {p.title} ({p.category === 'future' ? 'Future Project' : 'Present / Ongoing Project'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    type="text"
                    placeholder="e.g. Collaborative Environmental Research"
                    value={selectedProjectTitle}
                    onChange={(e) => setSelectedProjectTitle(e.target.value)}
                    className="block w-full max-w-full min-w-0 box-border min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                  />
                )}
              </div>

              <p className="md:col-span-2 text-xs text-slate-500 -mt-1 sm:-mt-2">
                Dynamically lists only Present and Future research initiatives under the selected Academic Wing.
              </p>
            </div>
          </div>

          {/* Group 3 — Qualifications & Custom PDF CV Dropzone */}
          <div className="mt-6 sm:mt-8">
            <div className="pb-2.5 mb-4 border-b border-slate-200">
              <h2 className="form-section-title text-[15px] sm:text-base font-bold tracking-wide uppercase leading-snug text-[#134e4a] m-0">
                3. QUALIFICATIONS &amp; CV UPLOAD
              </h2>
            </div>

            <div className="flex flex-col gap-4 sm:gap-5 w-full">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Relevant Skills &amp; Technical Toolset <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Python, ROS, MATLAB, QGIS, Remote Sensing, Machine Learning, Laboratory Techniques"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="block w-full max-w-full min-w-0 box-border min-h-[44px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Statement of Interest &amp; Motivation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Briefly describe why you want to collaborate on this research project and how your skills contribute..."
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  className="block w-full max-w-full min-w-0 box-border min-h-[120px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 leading-relaxed resize-y"
                />
              </div>

              {/* Responsive PDF CV Upload Dropzone */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Curriculum Vitae (PDF Upload) <span className="text-rose-500">*</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  id="pdf-upload"
                  accept=".pdf,application/pdf"
                  className="hidden !hidden"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {!pdfFile ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`w-full rounded-xl border-2 border-dashed ${
                      isDragging
                        ? 'border-teal-600 bg-teal-50/60'
                        : 'border-slate-300 hover:border-teal-600 bg-slate-50/70'
                    } p-5 sm:p-6 text-center cursor-pointer transition box-border flex flex-col items-center justify-center gap-2`}
                  >
                    <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">
                        Click to upload your CV (.pdf)
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        or drag and drop your file here
                      </span>
                    </div>
                    <span className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full mt-1">
                      PDF format only • Max 8MB
                    </span>
                  </div>
                ) : (
                  <div className="w-full rounded-xl border border-teal-200 bg-teal-50/60 p-4 box-border flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-teal-100/80 text-teal-800 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {pdfFile.name}
                        </p>
                        <p className="text-xs text-teal-700 font-medium">
                          {(pdfFile.size / 1024).toFixed(1)} KB • Ready for submission
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="shrink-0 text-xs font-semibold text-rose-600 hover:text-rose-800 px-3 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 transition-colors flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Change / Remove
                    </button>
                  </div>
                )}

                {pdfError && (
                  <p className="text-xs text-rose-600 mt-2 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {pdfError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Fee Notice & Responsive Submit Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-5 border-t border-slate-200 mt-4">
            <p className="text-xs text-slate-600 font-medium text-center sm:text-left leading-relaxed max-w-md">
              Stage 1 application is free. Once approved by Admin, a one-time BDT 1,000 onboarding fee (via bKash/Nagad) is required in Stage 2 to join the research project.
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[46px] px-7 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Application…
                </>
              ) : (
                <>
                  Submit Research Application
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
