import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { RichTextContent } from '../../components/common/RichTextContent';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
export function ScholarList() {
  const {data=[],isLoading,isError}=useQuery({queryKey:['scholars'],queryFn:async()=> (await api.get('/public/scholars')).data.data});
  return <section className="section"><div className="container"><h1>Young Scholars</h1>
    {isLoading&&<p role="status">Loading scholars…</p>}
    {isError&&<p role="alert">Could not load scholars.</p>}
    {!isLoading&&!isError&&!data.length&&<p className="muted">No scholars are listed yet.</p>}
    <div className="grid">{data.map((item:any)=><Link className="card profile-card" key={item._id} to={`/scholars/${item.slug}`}>
      <ProfileAvatar name={item.name} photo={item.photo}/>
      {item.sampleData&&<span className="badge-sample">Illustrative sample profile</span>}
      <h2>{item.name}</h2><p className="muted">{item.designation||'Young Scholar'}{item.cohort?` · Cohort ${item.cohort}`:''}</p>
      <RichTextContent content={item.bio||''} className="muted"/>
    </Link>)}</div>
  </div></section>;
}
