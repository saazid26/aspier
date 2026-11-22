import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { RichTextContent } from '../../components/common/RichTextContent';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { staticScholars } from '../../lib/staticData';

export function ScholarList() {
  const { data: remoteData = [] } = useQuery({
    queryKey: ['scholars'],
    queryFn: async () => (await api.get('/public/scholars')).data.data,
    initialData: staticScholars
  });
  const data = remoteData && remoteData.length > 0 ? remoteData : staticScholars;

  return <section className="section">
    <SEO title="Young Scholars | ASPIER" description="Meet the young scholars and student researchers at ASPIER." />
    <div className="container">
      <h1>Young Scholars</h1>
      {!data.length && <p className="muted">No scholars are listed yet.</p>}
      <div className="grid">{data.map((item: any) => <Link className="card profile-card" key={item._id} to={`/scholars/${item.slug}`}>
        <ProfileAvatar name={item.name} photo={item.photo}/>
        <h2>{item.name}</h2><p className="muted">{item.designation || 'Young Scholar'}{item.cohort ? ` · Cohort ${item.cohort}` : ''}</p>
        <RichTextContent content={item.bio || ''} className="muted"/>
      </Link>)}</div>
    </div>
  </section>;
}
