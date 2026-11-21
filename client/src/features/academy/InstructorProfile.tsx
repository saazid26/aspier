import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { RichTextContent } from '../../components/common/RichTextContent';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
export function InstructorProfile(){
  const {id}=useParams();
  const {data,isLoading,isError}=useQuery({queryKey:['instructor',id],queryFn:async()=>{const r=await api.get(`/academy/instructors/${id}`);return r.data.data}});
  if(isLoading)return <main className="container section"><p role="status">Loading instructor…</p></main>;
  if(isError||!data)return <main className="container section" role="alert"><h1>Instructor unavailable</h1><p className="muted">This profile may have moved or is temporarily unavailable.</p></main>;
  return <main className="container section">
    <ProfileAvatar name={data.name} photo={data.photo}/>
    {data.sampleData&&<span className="badge-sample">Sample instructor</span>}
    <h1>{data.name}</h1><p className="muted">{data.title}</p><RichTextContent content={data.bio||''}/>
    {!!data.expertise?.length&&<div className="domain-list">{data.expertise.map((skill:string)=><span className="domain-chip" key={skill}>{skill}</span>)}</div>}
  </main>
}
