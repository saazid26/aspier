import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { RichTextContent } from '../../components/common/RichTextContent';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { AcademicSocialLinks } from '../../components/common/AcademicSocialLinks';

export function SupervisorProfile() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['supervisor', slug],
    queryFn: async () => (await api.get(`/public/supervisors/${slug}`)).data.data
  });

  if (isLoading) return <main className="container section"><p role="status">Loading supervisor…</p></main>;
  if (isError || !data) return <main className="container section" role="alert"><h1>Supervisor unavailable</h1><p className="muted">This profile may have moved or is temporarily unavailable.</p></main>;

  return (
    <main className="container section profile-detail">
      <ProfileAvatar name={data.name} photo={data.photo} />
      {data.sampleData && <span className="badge-sample">Illustrative sample profile</span>}
      <h1>{data.name}</h1>
      <p className="muted">{[data.designation, data.affiliation].filter(Boolean).join(' · ')}</p>
      {!!data.researchInterests?.length && (
        <div className="domain-list">
          {data.researchInterests.map((domain: string) => (
            <span className="domain-chip" key={domain}>{domain}</span>
          ))}
        </div>
      )}
      {data.educationalBackground && <p><strong>Education:</strong> {data.educationalBackground}</p>}
      <RichTextContent className="muted" content={data.bio || ''} />
      <AcademicSocialLinks member={data} className="profile-detail-social-links" />
    </main>
  );
}
