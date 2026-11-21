import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { JoinMeetButton } from './JoinMeetButton';
import { formatDate } from '../../lib/utils';
export function ClassSchedule(){const {data}=useQuery({queryKey:['classes'],queryFn:async()=>{const r=await api.get('/academy/classes');return r.data.data}});return <main className="container section"><h1>Live class schedule</h1><div className="grid">{data?.map((x:any)=><article className="card" key={x._id}><h3>{x.title}</h3><p className="muted">{formatDate(x.scheduledAt)}</p><JoinMeetButton classId={x._id}/></article>)}</div></main>}
