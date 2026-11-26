import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CheckCircle2, Lock, Sparkles, User, ExternalLink, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ImageUploader } from '../../components/forms/ImageUploader';
import { cleanActivationToken } from './Login';
import { useAuth } from './AuthContext';

function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'researcher';
}

export function Onboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = cleanActivationToken(searchParams.get('token') || '');
  const initialRoleParam = searchParams.get('role') || '';
  const isMemberLoggedIn = Boolean(user && ['supervisor', 'youngScholar', 'young_scholar'].includes((user as any).role));

  // 1. Validate Token or Authenticated Member Session on Load
  const { data: validationData, isLoading, isError, error } = useQuery({
    queryKey: ['onboarding-validate', token, isMemberLoggedIn ? (user as any)?._id : ''],
    queryFn: async () => {
      const res = await api.get('/public/onboarding/validate', { params: token ? { token } : undefined });
      return res.data.data;
    },
    enabled: Boolean(token) || isMemberLoggedIn,
    retry: false
  });

  const applicant = validationData || {};
  const role: 'supervisor' | 'scholar' = applicant.role || (initialRoleParam === 'supervisor' ? 'supervisor' : 'scholar');
  const roleLabel = role === 'supervisor' ? 'Research Supervisor' : 'Young Scholar';

  // 2. Account Credentials State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 3. Profile Information State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [cohort, setCohort] = useState('2026');
  const [designation, setDesignation] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [educationalBackground, setEducationalBackground] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Academic & Social links
  const [researchGate, setResearchGate] = useState('');
  const [googleScholar, setGoogleScholar] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [orcid, setOrcid] = useState('');
  const [twitter, setTwitter] = useState('');
  const [website, setWebsite] = useState('');
  const [github, setGithub] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [publishedProfile, setPublishedProfile] = useState<any | null>(null);

  // Pre-fill form when validation data loads
  useEffect(() => {
    if (validationData) {
      setName(validationData.name || '');
      setSlug(slugify(validationData.name || ''));
      setDesignation(
        validationData.role === 'supervisor'
          ? (validationData.designation || 'Research Supervisor')
          : 'Young Scholar'
      );
      setAffiliation(validationData.role === 'supervisor' ? (validationData.institution || 'ASPIER') : '');
      setCohort('2026');
      setEducationalBackground(validationData.education || validationData.educationalBackground || validationData.academicStatus || '');
      setBio(validationData.bio || '');
      if (validationData.researchDomain || (validationData.researchDomains && validationData.researchDomains.length > 0)) {
        setTagsInput(validationData.researchDomain || validationData.researchDomains.join(', '));
      }
    }
  }, [validationData]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) {
      setSlug(slugify(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isMemberLoggedIn) {
      if (!password || password.length < 8) {
        toast.error('Password must be at least 8 characters.');
        return;
      }
      if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
        toast.error('Please use a mix of letters and numbers in your password.');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match.');
        return;
      }
    }
    if (!name.trim()) {
      toast.error('Full Name is required.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const profilePayload = {
      name: name.trim(),
      slug: (slug.trim() || slugify(name)).toLowerCase(),
      designation: role === 'scholar' ? 'Young Scholar' : designation.trim(),
      affiliation: role === 'scholar' ? '' : affiliation.trim(),
      education: educationalBackground.trim(),
      educationalBackground: educationalBackground.trim(),
      bio: bio.trim(),
      photo: photo.trim(),
      cohort: role === 'scholar' ? '2026' : (cohort.trim() || '2026'),
      ...(role === 'supervisor'
        ? {
            researchInterests: tags,
            researchGate: researchGate.trim(),
            googleScholar: googleScholar.trim(),
            linkedin: linkedin.trim(),
            orcid: orcid.trim(),
            twitter: twitter.trim(),
            website: website.trim()
          }
        : {
            researchTopics: tags,
            researchGate: researchGate.trim(),
            googleScholar: googleScholar.trim(),
            linkedin: linkedin.trim(),
            orcid: orcid.trim(),
            twitter: twitter.trim(),
            github: github.trim()
          })
    };

    setSubmitting(true);
    try {
      await api.post('/public/onboarding/complete', {
        ...(token ? { token } : {}),
        ...(password ? { password } : {}),
        profile: profilePayload
      });

      toast.success('Stage 2 Final Profile submitted for Admin review!');
      setPublishedProfile({ name: profilePayload.name, status: 'final_pending' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not complete onboarding. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token && !isMemberLoggedIn) {
    return (
      <main className="container section" style={{ maxWidth: 640 }}>
        <SEO title="Onboarding | ASPIER" description="Official researcher onboarding at ASPIER." />
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <ShieldCheck size={48} style={{ color: '#0f766e', margin: '0 auto 16px' }} />
          <h1>Invalid Onboarding Access</h1>
          <p className="muted" style={{ margin: '12px 0 24px' }}>
            A personalized onboarding token is required to access this portal. Please use the secure link provided in your approval notification email.
          </p>
          <Link className="button button-primary" to="/login">Go to Login</Link>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="container section" style={{ maxWidth: 640 }}>
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div className="skeleton" style={{ height: 32, width: 220, margin: '0 auto 16px' }} />
          <div className="skeleton" style={{ height: 16, width: 340, margin: '0 auto 24px' }} />
          <p className="muted">Verifying your secure onboarding credentials…</p>
        </div>
      </main>
    );
  }

  if (isError) {
    const errorMsg = (error as any)?.response?.data?.message || 'This onboarding link is invalid or has expired.';
    return (
      <main className="container section" style={{ maxWidth: 640 }}>
        <SEO title="Onboarding Error | ASPIER" description="Onboarding verification status." />
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, fontWeight: 700 }}>
            ✕
          </div>
          <h1>Onboarding Link Unavailable</h1>
          <p className="muted" style={{ margin: '14px 0 24px', lineHeight: 1.6 }}>{errorMsg}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link className="button button-primary" to="/login">Sign In</Link>
            <Link className="button button-secondary" to="/contact">Contact Support</Link>
          </div>
        </div>
      </main>
    );
  }

  // 4. Submitted / Published Confirmation State
  const alreadySubmitted = applicant.status === 'final_pending' || applicant.status === 'published';
  if (publishedProfile || alreadySubmitted) {
    const isPublished = applicant.status === 'published' && !publishedProfile;
    return (
      <main className="container section" style={{ maxWidth: 720 }}>
        <SEO title={isPublished ? 'Profile Published | ASPIER' : 'Stage 2 Profile Submitted | ASPIER'} description="Your ASPIER researcher onboarding status." />
        <div className="card" style={{ textAlign: 'center', padding: '44px 28px' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <CheckCircle2 size={38} />
          </div>
          <span className="eyebrow" style={{ color: '#0f766e', fontWeight: 700 }}>
            <Sparkles size={14} style={{ display: 'inline', marginRight: 4 }} />
            {isPublished ? 'Official Profile Published' : 'Stage 2: Profile Review'}
          </span>
          <h1 style={{ margin: '8px 0 10px', fontSize: '2rem' }}>
            {isPublished ? 'Welcome to the ASPIER Team!' : 'Final Team Profile Submitted!'}
          </h1>
          <p className="muted" style={{ fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 540, margin: '0 auto 28px' }}>
            {isPublished ? (
              <>Congratulations, <strong>{name || applicant.name}</strong>! Your profile card is <strong>live on the public Team page</strong>.</>
            ) : (
              <>Thank you, <strong>{name || applicant.name}</strong>! Your Stage 2 Final Team Profile has been submitted for Admin review. Once approved, your profile will be published automatically to the public <strong>/team</strong> page.</>
            )}
          </p>

          {/* Mini Preview Card Matching /team exact layout */}
          <div style={{ maxWidth: 420, margin: '0 auto 32px', textAlign: 'left', border: '1px solid rgba(20,143,131,0.2)', borderRadius: 16, padding: '22px 20px', background: '#f8fafc', boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              {photo ? (
                <img src={photo} alt={name} style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #0f766e' }} />
              ) : (
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#ccfbf1', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700 }}>
                  {name.charAt(0)}
                </div>
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>{name}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#0f766e', fontWeight: 600 }}>
                  {role === 'supervisor' ? designation : `ASPIER Scholar • Cohort ${cohort}`}
                </p>
                {affiliation && <small style={{ color: '#64748b' }}>{affiliation}</small>}
              </div>
            </div>

            {educationalBackground && (
              <p style={{ margin: '8px 0', fontSize: '0.84rem', color: '#475569' }}>
                <strong>Education:</strong> {educationalBackground}
              </p>
            )}

            {bio && (
              <p style={{ margin: '8px 0', fontSize: '0.86rem', color: '#334155', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {bio}
              </p>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {tagsInput.split(',').slice(0, 3).map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                <span key={tag} style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.72rem', padding: '3px 8px', borderRadius: 999, fontWeight: 600 }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
            <Link
              className="button button-primary"
              to={`/team#${role === 'supervisor' ? 'supervisors' : 'young-scholars'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', fontSize: '1rem' }}
            >
              <span>View My Profile on /team</span>
              <ExternalLink size={16} />
            </Link>
            <Link
              className="button button-secondary"
              to="/login"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', fontSize: '1rem' }}
            >
              <span>Sign In to Member Portal</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // 5. Onboarding Sign-Up Form
  return (
    <main className="container section" style={{ maxWidth: 760 }}>
      <SEO title={`${roleLabel} Onboarding | ASPIER`} description="Complete your ASPIER researcher account and profile setup." />
      
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <span className="badge badge-teal" style={{ marginBottom: 8, fontSize: '0.82rem', padding: '4px 12px' }}>
          Approved Candidate Onboarding
        </span>
        <h1 style={{ margin: '6px 0 8px', fontSize: '2.1rem' }}>{roleLabel} Profile & Account Setup</h1>
        <p className="muted" style={{ maxWidth: 620, margin: '0 auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Set your secure credentials and complete your official researcher profile. Once submitted, your profile will be <strong>automatically published directly to the ASPIER Team page</strong>.
        </p>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        {/* SECTION 1: Account Credentials */}
        <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(20,143,131,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#ccfbf1', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Step 1: Account Setup</h2>
              <small className="muted">Your private credentials to sign in to the ASPIER platform.</small>
            </div>
          </div>

          <label>
            Approved Email Address
            <div style={{ position: 'relative' }}>
              <Input
                readOnly
                value={applicant.email || ''}
                style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed', paddingRight: 40 }}
              />
              <span style={{ position: 'absolute', right: 12, top: 12, color: '#10b981', fontSize: '0.78rem', fontWeight: 600 }}>
                ✓ Verified
              </span>
            </div>
            <small className="muted">Permanently locked to your approved application email.</small>
          </label>

          {!isMemberLoggedIn && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 12 }}>
            <label>
              Create Account Password
              <Input
                required
                type="password"
                minLength={8}
                maxLength={128}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 4, display: 'block' }}>
                Use at least 8–10 characters with a mix of letters and numbers.
              </span>
            </label>
            <label>
              Confirm Password
              <Input
                required
                type="password"
                minLength={8}
                maxLength={128}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
          </div>
          )}
        </div>

        {/* SECTION 2: Role-Specific Profile Information */}
        <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(20,143,131,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Step 2: {roleLabel} Profile</h2>
              <small className="muted">Matches the official CMS schema and renders directly on /team.</small>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <label>
              Full Name *
              <Input
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Dr. Rafiq Hasan"
              />
            </label>

            <label>
              Slug / Username Preview *
              <Input
                required
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setSlugEdited(true);
                }}
                placeholder="e.g. rafiq-hasan"
              />
              <small className="muted">Public URL: /team or /{role === 'supervisor' ? 'supervisors' : 'scholars'}/{slug || 'your-slug'}</small>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 12 }}>
            {role === 'supervisor' ? (
              <>
                <label>
                  Designation *
                  <Input
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Associate Professor / Research Director"
                  />
                </label>
                <label>
                  Affiliation *
                  <Input
                    required
                    value={affiliation}
                    onChange={(e) => setAffiliation(e.target.value)}
                    placeholder="e.g. ASPIER / University Name"
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Cohort / Batch * <span className="muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>(Locked)</span>
                  <Input
                    required
                    readOnly
                    disabled
                    value="2026"
                    style={{ background: '#f1f5f9', color: '#475569', cursor: 'not-allowed', fontWeight: 600 }}
                  />
                  <small className="muted">Fixed to 2026 for new Young Scholars. Editable only by Admin in Admin CMS.</small>
                </label>
                <label>
                  Designation / Role * <span className="muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>(Locked)</span>
                  <Input
                    required
                    readOnly
                    disabled
                    value="Young Scholar"
                    style={{ background: '#f1f5f9', color: '#475569', cursor: 'not-allowed', fontWeight: 600 }}
                  />
                  <small className="muted">Fixed to Young Scholar. Editable only by Admin in Admin CMS.</small>
                </label>
              </>
            )}
          </div>

          <label style={{ marginTop: 12 }}>
            Education / Study Details *
            <Input
              required
              value={educationalBackground}
              onChange={(e) => setEducationalBackground(e.target.value)}
              placeholder={role === 'supervisor' ? 'e.g. Ph.D. in Aeronautical Engineering, M.Sc. in Applied Physics' : 'e.g. Undergraduate study in geography and data science.'}
            />
            <small className="muted">Displayed as <strong>Education:</strong> on your public /team profile card.</small>
          </label>

          <label style={{ marginTop: 12 }}>
            Biography & Research Statement *
            <textarea
              required
              rows={4}
              className="textarea"
              style={{ width: '100%', borderRadius: 10, padding: 12 }}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief summary of your academic background, scientific focus, and current research objectives."
            />
          </label>

          <label style={{ marginTop: 12 }}>
            {role === 'supervisor' ? 'Research Interests' : 'Research Topics'} (comma-separated tags) *
            <Input
              required
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. Aeronautical Systems, Environmental Toxicology, GIS"
            />
          </label>

          {/* Photo Upload: 1:1 Circle Max 2MB */}
          <div style={{ marginTop: 20 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
              {roleLabel} Profile Photo (1:1 Circle)
            </label>
            <ImageUploader
              value={photo}
              onUploaded={(url) => setPhoto(url)}
              shape="circle"
              helperText="Recommended: 500 × 500 px • 1:1 Circle preview • Max 2MB"
              maxSizeMB={2}
              endpoint="/public/onboarding/photo"
            />
            {photo && (
              <Button type="button" variant="secondary" style={{ marginTop: 8 }} onClick={() => setPhoto('')}>
                Remove Photo
              </Button>
            )}
          </div>
        </div>

        {/* SECTION 3: Academic & Social Profile Links */}
        <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(20,143,131,0.2)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: 6 }}>Academic & Social Profiles (Optional)</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Links with valid URLs will appear as icons on your profile card. Any left empty will be automatically hidden with zero broken buttons.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <label>
              ResearchGate URL
              <Input
                type="url"
                placeholder="https://www.researchgate.net/profile/..."
                value={researchGate}
                onChange={(e) => setResearchGate(e.target.value)}
              />
            </label>

            <label>
              Google Scholar URL
              <Input
                type="url"
                placeholder="https://scholar.google.com/citations?user=..."
                value={googleScholar}
                onChange={(e) => setGoogleScholar(e.target.value)}
              />
            </label>

            <label>
              LinkedIn URL
              <Input
                type="url"
                placeholder="https://www.linkedin.com/in/..."
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
              />
            </label>

            <label>
              ORCID URL
              <Input
                type="url"
                placeholder="https://orcid.org/0000-..."
                value={orcid}
                onChange={(e) => setOrcid(e.target.value)}
              />
            </label>

            <label>
              X (Twitter) URL
              <Input
                type="url"
                placeholder="https://x.com/..."
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
              />
            </label>

            {role === 'supervisor' ? (
              <label>
                Personal / Academic Website URL
                <Input
                  type="url"
                  placeholder="https://..."
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            ) : (
              <label>
                GitHub Profile URL
                <Input
                  type="url"
                  placeholder="https://github.com/..."
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                />
              </label>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Button
            disabled={submitting}
            style={{
              padding: '14px 36px',
              fontSize: '1.08rem',
              fontWeight: 700,
              minWidth: 280,
              boxShadow: '0 4px 16px rgba(15,118,110,0.3)'
            }}
          >
            {submitting ? 'Submitting Stage 2 Profile…' : 'Submit Stage 2 Final Profile'}
          </Button>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: 12 }}>
            By submitting, your Stage 2 profile enters Admin review and will be published to the ASPIER Team directory upon final approval.
          </p>
        </div>
      </form>
    </main>
  );
}
