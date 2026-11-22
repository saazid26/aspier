import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Upload, CheckCircle2, Copy, Check, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, getApiErrorMessage } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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
  const navigate = useNavigate();

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState<{
    applicationId: string;
    name: string;
    wingName: string;
    researchTitle: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Initialize selected wing from URL param
  useEffect(() => {
    if (initialWingParam && wings.length > 0) {
      const match = wings.find(
        (w) => w.slug === initialWingParam || w._id === initialWingParam || w.name.toLowerCase() === initialWingParam.toLowerCase()
      );
      if (match) {
        setSelectedWingSlug(match.slug);
      }
    } else if (wings.length > 0 && !selectedWingSlug) {
      setSelectedWingSlug(wings[0].slug);
    }
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

      const wingId = typeof r.wingId === 'object' ? r.wingId?._id || r.wingId?.slug : r.wingId;
      const matchesWing =
        r.wingSlug === currentWing.slug ||
        wingId === currentWing._id ||
        wingId === currentWing.slug;

      return matchesWing;
    });

    // If specific wing has no explicitly tagged projects in seed, include non-past general projects
    if (matching.length === 0) {
      return allResearch.filter((r) => r.category !== 'past');
    }
    return matching;
  }, [selectedWingSlug, wings, allResearch]);

  // Auto-select target project when wing projects change or from initialProjectParam
  useEffect(() => {
    if (wingProjects.length > 0) {
      if (initialProjectParam) {
        const found = wingProjects.find(
          (p) => p.slug === initialProjectParam || p.title.toLowerCase() === initialProjectParam.toLowerCase() || p._id === initialProjectParam
        );
        if (found) {
          setSelectedProjectTitle(found.title);
          return;
        }
      }
      // If current selection is not in wingProjects, pick first
      const stillValid = wingProjects.some((p) => p.title === selectedProjectTitle);
      if (!stillValid) {
        setSelectedProjectTitle(wingProjects[0].title);
      }
    } else {
      setSelectedProjectTitle('');
    }
  }, [wingProjects, initialProjectParam]);

  // Handle PDF file selection & validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPdfError('');
    const file = e.target.files?.[0];
    if (!file) {
      setPdfFile(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setPdfError('Please upload a PDF document (.pdf) only.');
      setPdfFile(null);
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setPdfError('File size exceeds 8MB. Please upload a smaller PDF.');
      setPdfFile(null);
      return;
    }

    setPdfFile(file);
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
        researchTitle: selectedProjectTitle
      });

      toast.success('Stage 1 Research Mate application submitted successfully!');
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Failed to submit application. Please review your details.');
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionReceipt) {
    return (
      <main className="container section" style={{ maxWidth: 720 }}>
        <SEO title="Application Submitted | Research Mate" description="Your Research Mate application has been received." />
        <article className="card p-8 rounded-2xl border border-slate-200 shadow-sm bg-white text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Stage 1 Application Received
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Thank you, {submissionReceipt.name}!</h1>
            <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto">
              Your application to join <strong>{submissionReceipt.researchTitle}</strong> under the <strong>{submissionReceipt.wingName}</strong> as a <strong>Research Mate</strong> has been officially logged for faculty review.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2 max-w-md mx-auto">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
              Your Unique Application ID
            </label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={submissionReceipt.applicationId}
                className="font-mono text-base font-bold text-teal-800 bg-white select-all text-center"
              />
              <Button
                type="button"
                onClick={() => copyAppId(submissionReceipt.applicationId)}
                className={`shrink-0 flex items-center gap-1 text-xs px-3 py-2 ${copiedId ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}
              >
                {copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-xs text-slate-500 pt-1">
              Save this ID. When our administration approves Stage 1, you will use it with your Private Access Code to complete Stage 2 verification &amp; onboarding.
            </p>
          </div>

          <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 text-left space-y-1.5">
            <p className="font-semibold text-teal-950">Next Steps &amp; Review Timeline:</p>
            <p>1. Our academic wing review committee examines your CV, technical skills, and research alignment.</p>
            <p>2. Upon Stage 1 approval, you will receive a notification and a <strong>Private Access Code</strong>.</p>
            <p>3. Enter your credentials in the <strong>Check Application</strong> portal to complete Stage 2 verification (BDT 1,000 project fee) and join the official project WhatsApp group.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100">
            <Link to="/check-application" className="button button-primary inline-flex items-center gap-2 w-full sm:w-auto">
              Go to Check Application Portal <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to={`/wings/${selectedWingSlug}`} className="button button-secondary w-full sm:w-auto">
              Return to Academic Wing
            </Link>
          </div>
        </article>
      </main>
    );
  }

  return (
    <main className="container section" style={{ maxWidth: 780 }}>
      <SEO
        title="Apply as Research Mate | ASPIER Academic Wings"
        description="Apply to join ongoing and future research projects across ASPIER Academic Wings as a Research Mate."
      />

      <div className="mb-6">
        <Link to={selectedWingSlug ? `/wings/${selectedWingSlug}` : '/wings'} className="text-xs font-medium text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 mb-2">
          ← Back to {selectedWingSlug ? 'Academic Wing' : 'Wings'}
        </Link>
        <span className="eyebrow block">Academic Wings · Collaborative Research</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
          Apply to Join Research (Research Mate)
        </h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Stage 1 is free for all prospective Research Mates. Join active research investigations, co-author publications, and collaborate directly with ASPIER Supervisors and Scholars.
        </p>
      </div>

      <form className="card p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm bg-white space-y-6" onSubmit={handleSubmit}>
        {/* Field 1: Apply As (Locked) */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
            Apply As <span className="text-slate-400 font-normal">(Locked Role)</span>
          </label>
          <div className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-lg border border-slate-200 text-slate-700">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-semibold text-sm text-slate-800">Research Mate</span>
            <span className="ml-auto text-xs text-slate-500 font-medium italic">Project collaborator role</span>
          </div>
        </div>

        {/* Fields 2 & 3: Full Name & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="e.g. Tariqul Islam"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              type="email"
              placeholder="e.g. tariqul@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Contact Phone */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
            Phone / WhatsApp Number
          </label>
          <Input
            placeholder="e.g. +880 1711-223344"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* Fields 4, 5, 6: University, Department & Occupation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
              University / Institution <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="e.g. BUET, University of Dhaka, RUET..."
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
              Department <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="e.g. Mechanical Engineering, Physics, CSE..."
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
            Occupation / Current Workplace <span className="text-rose-500">*</span>
          </label>
          <Input
            required
            placeholder="e.g. 4th Year Undergraduate Student, Research Assistant at Lab X, Software Engineer at Company Y"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">
            Free-text field: state your current job/role and company or your current study year and student status.
          </p>
        </div>

        {/* Field 7: Preferred Academic Wing (Dropdown) */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
            Preferred Academic Wing <span className="text-rose-500">*</span>
          </label>
          <select
            className="w-full p-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={selectedWingSlug}
            onChange={(e) => setSelectedWingSlug(e.target.value)}
            required
          >
            {wings.map((w) => (
              <option key={w.slug || w._id} value={w.slug}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Field 8: Target Research Program / Project (Dynamic Sub-Selection Dropdown) */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
            Target Research Program / Project <span className="text-rose-500">*</span>
          </label>
          {wingProjects.length > 0 ? (
            <select
              className="w-full p-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={selectedProjectTitle}
              onChange={(e) => setSelectedProjectTitle(e.target.value)}
              required
            >
              {wingProjects.map((p) => (
                <option key={p._id || p.slug || p.title} value={p.title}>
                  {p.title} ({p.category === 'future' ? 'Future Project' : 'Present / Active Project'})
                </option>
              ))}
            </select>
          ) : (
            <Input
              required
              placeholder="e.g. Collaborative Environmental Research"
              value={selectedProjectTitle}
              onChange={(e) => setSelectedProjectTitle(e.target.value)}
            />
          )}
          <p className="text-xs text-slate-500 mt-1">
            Dynamically lists only Present and Future research initiatives under the selected Academic Wing.
          </p>
        </div>

        {/* Field 9: Relevant Skills */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
            Relevant Skills &amp; Technical Toolset <span className="text-rose-500">*</span>
          </label>
          <Input
            required
            placeholder="e.g. Python, ROS, MATLAB, QGIS, Remote Sensing, Machine Learning, Laboratory Techniques"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />
        </div>

        {/* Field 10: Statement of Interest */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
            Statement of Interest &amp; Motivation
          </label>
          <textarea
            className="w-full p-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
            rows={4}
            placeholder="Briefly describe why you want to collaborate on this research project and how your skills contribute..."
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
          />
        </div>

        {/* Field 11: CV & Work Experience (PDF Upload strictly) */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-1">
            CV &amp; Work Experience (PDF Upload) <span className="text-rose-500">*</span>
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-teal-500 transition-colors bg-slate-50">
            <input
              type="file"
              id="pdf-upload"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center justify-center gap-2">
              <Upload className="w-8 h-8 text-teal-600" />
              <span className="text-sm font-semibold text-slate-800">
                {pdfFile ? pdfFile.name : 'Click to select your CV (.pdf)'}
              </span>
              <span className="text-xs text-slate-500">
                Accepts PDF format only (Max 8MB). Stored securely for faculty and administrator review.
              </span>
            </label>
          </div>
          {pdfError && <p className="text-xs text-rose-600 mt-1.5 font-medium">{pdfError}</p>}
          {pdfFile && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold truncate">{pdfFile.name}</span>
              <span className="text-emerald-600">({(pdfFile.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-slate-500">
            Stage 1 application is 100% free. No payment required until Stage 1 acceptance.
          </p>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-teal-700 hover:bg-teal-800 text-white font-semibold py-2.5 px-6 rounded-lg shadow-sm"
          >
            {isSubmitting ? 'Submitting Application…' : 'Submit Stage 1 Application →'}
          </Button>
        </div>
      </form>
    </main>
  );
}
