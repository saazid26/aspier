import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { RichTextContent } from '../../components/common/RichTextContent';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { AcademicSocialLinks } from '../../components/common/AcademicSocialLinks';

export function ScholarProfile() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['scholar', slug],
    queryFn: async () => (await api.get(`/public/scholars/${slug}`)).data.data
  });

  if (isLoading) return <main className="container section"><p role="status">Loading scholar…</p></main>;
  if (isError || !data) return <main className="container section" role="alert"><h1>Scholar unavailable</h1><p className="muted">This profile may have moved or is temporarily unavailable.</p></main>;

  return (
    <main className="container section profile-detail">
      <ProfileAvatar name={data.name} photo={data.photo} />
      {data.sampleData && <span className="badge-sample">Illustrative sample profile</span>}
      <h1>{data.name}</h1>
      <p className="muted">{[data.designation, data.affiliation, data.cohort ? `Cohort ${data.cohort}` : ''].filter(Boolean).join(' · ')}</p>
      {!!data.researchTopics?.length && (
        <div className="domain-list">
          {data.researchTopics.map((topic: string) => (
            <span className="domain-chip" key={topic}>{topic}</span>
          ))}
        </div>
      )}
      {data.educationalBackground && <p><strong>Education:</strong> {data.educationalBackground}</p>}
      <RichTextContent className="muted" content={data.bio || ''} />
      <AcademicSocialLinks member={data} className="profile-detail-social-links" />
    </main>
  );
}
