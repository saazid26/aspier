import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  Download,
  Copy,
  AlertTriangle,
  Award,
  Calendar,
  User,
  BookOpen,
  Check,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';

interface VerifiedCertificate {
  credentialId: string;
  studentName: string;
  studentEmail?: string;
  recipientRole?: 'Student' | 'Instructor';
  courseTitle: string;
  issueDate: string;
  certificateImage?: string;
  imageUrl: string;
  rawImageUrl?: string;
  absoluteImageUrl?: string;
  verifyUrl?: string;
  status: string;
  verifiedAt: string;
}

export function VerifyCertificate() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [credentialId, setCredentialId] = useState('');
  const [loading, setLoading] = useState(false);
  const [certificate, setCertificate] = useState<VerifiedCertificate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const queryId = searchParams.get('id') || searchParams.get('credentialId') || '';

  const handleVerify = async (idToVerify: string) => {
    const cleanId = idToVerify.trim().toUpperCase();
    if (!cleanId) {
      setError('Please enter a valid Credential ID (e.g. ASP-ACAD-2026-...).');
      setCertificate(null);
      return;
    }

    setLoading(true);
    setError(null);
    setCertificate(null);

    try {
      // Primary: request with query parameter to guarantee forward slashes in IDs (e.g. 26/11-06) are never split
      const res = await api.get('/certificates/verify', {
        params: { id: cleanId }
      });
      if (res.data?.valid && res.data?.certificate) {
        setCertificate(res.data.certificate);
        // Sync URL param without full page reload
        setSearchParams({ id: cleanId }, { replace: true });
        return;
      } else {
        setError(res.data?.message || 'Certificate verification failed.');
      }
    } catch (err: any) {
      // Fallback: try encoded path parameter
      try {
        const fallbackRes = await api.get(`/certificates/verify/${encodeURIComponent(cleanId)}`);
        if (fallbackRes.data?.valid && fallbackRes.data?.certificate) {
          setCertificate(fallbackRes.data.certificate);
          setSearchParams({ id: cleanId }, { replace: true });
          return;
        }
      } catch {
        // preserve original error
      }
      const msg =
        err?.response?.data?.message ||
        `No verified ASPIER Academy certificate found with Credential ID "${cleanId}". Please check the ID or contact academy administration.`;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryId) {
      setCredentialId(queryId.toUpperCase());
      handleVerify(queryId);
    }
  }, [queryId]);

  const copyToClipboard = async (text: string, type: 'link' | 'id') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handleDownload = () => {
    if (!certificate) return;
    const downloadSrc = certificate.certificateImage || certificate.imageUrl;
    const cleanFilename = (certificate.credentialId || 'Certificate').replace(/[/\\?%*:|"<>]/g, '-');
    const link = document.createElement('a');
    link.href = downloadSrc;
    link.download = `ASPIER-Certificate-${cleanFilename}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <SEO
        title="Verify Certificate | ASPIER Academy"
        description="Verify authentic ASPIER Academy course completion certificates and credential IDs issued by the Aeronautical, Spatial, Planetary Institution for Environmental Research."
        keywords="ASPIER Academy certificate verification, verify ASPIER credential, ASPIER Academy student credential, aeronautical research certificate, spatial planetary environmental institute"
        canonicalPath="/academy/verify-certificate"
      />

      <div className="verify-page min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header Banner */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Official Institutional Registry
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              ASPIER Academy Certificate Verification
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
              Validate authentic course completion credentials and view official high-resolution PNG
              certificates issued by the Aeronautical, Spatial, Planetary Institution for Environmental Research.
            </p>
          </div>

          {/* Search Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify(credentialId);
              }}
              className="space-y-4"
            >
              <label htmlFor="credentialIdInput" className="block text-sm font-semibold text-slate-800">
                Enter Credential ID
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    id="credentialIdInput"
                    type="text"
                    value={credentialId}
                    onChange={(e) => setCredentialId(e.target.value.toUpperCase())}
                    placeholder="e.g. ASP-ACAD-2026-XXXXX"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition"
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer text-sm sm:text-base shrink-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Verify Credential
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-900 flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-semibold text-base">Verification Notice</h3>
                <p className="text-sm text-red-700">{error}</p>
                <p className="text-xs text-red-600 pt-1">
                  If this certificate was claimed within the last 6 to 12 hours, please allow the institutional review queue to complete final issuance.
                </p>
              </div>
            </div>
          )}

          {/* Verified Certificate Display Card */}
          {certificate && (
            <div className="bg-white rounded-2xl shadow-md border border-teal-200 overflow-hidden transition">
              {/* Card Banner */}
              <div className="bg-gradient-to-r from-teal-800 to-teal-700 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-600/50 border border-teal-400/40 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7 text-emerald-300" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs uppercase tracking-wider font-bold text-emerald-300">
                        Verified Authentic Credential
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border shadow-sm ${
                          certificate.recipientRole === 'Instructor'
                            ? 'bg-amber-400 text-slate-950 border-amber-300'
                            : 'bg-emerald-400 text-slate-950 border-emerald-300'
                        }`}
                      >
                        Issued as: {certificate.recipientRole || 'Student'}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {certificate.studentName}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}/academy/verify-certificate?id=${certificate.credentialId}`,
                        'link'
                      )
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-medium text-white transition cursor-pointer"
                    title="Copy direct verification link"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Link Copied!' : 'Copy Link'}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold text-white transition shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </button>
                </div>
              </div>

              {/* Details & PNG Image Body */}
              <div className="p-6 sm:p-8 space-y-8">
                {/* Information Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-teal-600" />
                      Credential ID
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {certificate.credentialId}
                      </span>
                      <button
                        onClick={() => copyToClipboard(certificate.credentialId, 'id')}
                        className="text-slate-400 hover:text-teal-700 transition p-1"
                        title="Copy Credential ID"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-teal-600" />
                      Recipient Name
                    </span>
                    <p className="font-semibold text-slate-900 text-sm truncate">
                      {certificate.studentName}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-teal-600" />
                      Recipient Role
                    </span>
                    <div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                          certificate.recipientRole === 'Instructor'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {certificate.recipientRole || 'Student'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                      Course Program
                    </span>
                    <p className="font-semibold text-slate-900 text-sm truncate" title={certificate.courseTitle}>
                      {certificate.courseTitle}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      Date of Issue
                    </span>
                    <p className="font-semibold text-slate-900 text-sm">
                      {new Date(certificate.issueDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Clear Institutional Verification Statement right above PNG */}
                <div
                  className={`p-4 rounded-xl border flex items-center gap-3.5 ${
                    certificate.recipientRole === 'Instructor'
                      ? 'bg-indigo-50/90 border-indigo-200 text-indigo-950'
                      : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      certificate.recipientRole === 'Instructor'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-emerald-600 text-white shadow-sm'
                    }`}
                  >
                    <Award className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium leading-relaxed">
                    Verified Institutional Credential — Officially awarded to{' '}
                    <strong className="font-bold underline decoration-current/30 underline-offset-2">
                      {certificate.studentName}
                    </strong>{' '}
                    as {certificate.recipientRole === 'Instructor' ? 'an' : 'a'}{' '}
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-extrabold uppercase tracking-wide ${
                        certificate.recipientRole === 'Instructor'
                          ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {certificate.recipientRole || 'Student'}
                    </span>{' '}
                    for{' '}
                    <strong className="font-bold underline decoration-current/30 underline-offset-2">
                      {certificate.courseTitle}
                    </strong>
                    .
                  </p>
                </div>

                {/* PNG Certificate Viewer with Live Sub-0.2s Image Endpoint */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Award className="w-4 h-4 text-teal-600" />
                      Official PNG Certificate Preview
                    </h3>
                    <a
                      href={certificate.certificateImage || certificate.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 font-medium"
                    >
                      View Certificate <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="relative rounded-xl border-2 border-slate-200 bg-slate-900/5 p-2 sm:p-4 overflow-hidden flex items-center justify-center">
                    <img
                      src={certificate.certificateImage || certificate.imageUrl}
                      alt={`Certificate for ${certificate.studentName} - ${certificate.courseTitle}`}
                      className="w-full max-h-[600px] object-contain rounded-lg shadow-sm border border-slate-200 bg-white"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                </div>

                {/* Institutional Security Notice */}
                <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-100 text-xs text-teal-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-700" />
                    Cryptographic & Institutional Verification Guarantee
                  </p>
                  <p className="text-teal-800/90 leading-relaxed">
                    This certificate is cryptographically recorded in the ASPIER Academy Institutional Registry.
                    Its authenticity, student details, course title, and completion date are verified directly
                    by the Aeronautical, Spatial, Planetary Institution for Environmental Research.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Educational Trust Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-base">Direct Registry Lookup</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Verification requests cross-reference the central ASPIER Academy registry in real time to guarantee
                tamper-proof validation.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-base">6–12h Issuance Standard</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upon course completion, student claims undergo academic verification before permanent Credential IDs
                and PNG credentials are generated.
              </p>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-2">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-base">Global Academic Standing</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                ASPIER credentials validate competencies across aerospace engineering, satellite remote sensing,
                planetary analytics, and climate research.
              </p>
            </div>
          </div>

          {/* Back Navigation */}
          <div className="text-center pt-4">
            <Link
              to="/academy"
              className="text-sm font-semibold text-teal-700 hover:text-teal-800 transition inline-flex items-center gap-1.5"
            >
              ← Back to ASPIER Academy Courses
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
