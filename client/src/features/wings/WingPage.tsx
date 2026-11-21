import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { RichTextContent } from '../../components/common/RichTextContent';
import { Link } from 'react-router-dom';
import { CoverMedia } from '../../components/common/CoverMedia';

export function WingPage() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['wing', slug],
    queryFn: async () => (await api.get(`/public/wings/${slug}`)).data.data
  });
  if (isLoading) return <main className="container section"><p role="status">Loading academic wing…</p></main>;
  if (isError || !data) return <main className="container section" role="alert"><h1>Academic wing unavailable</h1><p className="muted">This wing may have moved or is temporarily unavailable.</p><Link className="button button-secondary" to="/wings">Back to wings</Link></main>;
  return <main className="container section">
    <CoverMedia src={data.coverImage} alt={`${data.name} cover`} fallbackLabel={data.name} className="research-detail-cover" fallbackClassName="wing-image-placeholder"/>
    <span className="eyebrow">Academic wing</span><h1>{data.name}</h1>
    <RichTextContent className="muted" content={data.description || ''}/>
    <div className="grid" style={{marginTop:24}}>
      <article className="card"><h3>Disciplines</h3>{data.disciplines?.map((item:string)=><p key={item} className="muted">{item}</p>)}</article>
      <article className="card"><h3>Objectives</h3>{Array.isArray(data.objectives)?data.objectives.map((item:string)=><p key={item} className="muted">{item}</p>):<RichTextContent content={data.objectives || ''}/>}</article>
      <article className="card"><h3>Research</h3>{data.research?.length ? data.research.map((item:any)=><p key={item._id}><Link to={`/research/${item.slug}`}>{item.title}</Link></p>) : <p className="muted">No published research is linked to this wing yet.</p>}</article>
    </div>
  </main>;
}
