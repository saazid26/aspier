import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { RichTextContent } from '../../components/common/RichTextContent';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { staticSupervisors } from '../../lib/staticData';

export function SupervisorList() {
  const { data: remoteData = [] } = useQuery({
    queryKey: ['supervisors'],
    queryFn: async () => (await api.get('/public/supervisors')).data.data,
    initialData: staticSupervisors
  });
  const data = remoteData && remoteData.length > 0 ? remoteData : staticSupervisors;

  return <section className="section">
    <SEO title="Supervisors | ASPIER" description="Meet the research supervisors and faculty mentors at ASPIER." />
    <div className="container">
      <h1>Supervisors</h1>
      {!data.length && <p className="muted">No supervisors are listed yet.</p>}
      <div className="grid">{data.map((item: any) => <Link className="card profile-card" key={item._id} to={`/supervisors/${item.slug}`}>
        <ProfileAvatar name={item.name} photo={item.photo}/>
        {item.sampleData && <span className="badge-sample">Illustrative sample profile</span>}
        <h2>{item.name}</h2><p className="muted">{item.designation}</p><p className="muted">{item.affiliation}</p>
        <RichTextContent content={item.bio || ''} className="muted"/>
      </Link>)}</div>
    </div>
  </section>;
}
