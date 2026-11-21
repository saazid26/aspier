import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useCountdown } from '../../hooks/useCountdown';
import { Badge } from '../../components/ui/Badge';
export function PaymentStatus(){const {id}=useParams();const {data}=useQuery({queryKey:['payment-status',id],queryFn:async()=>{const r=await api.get(`/payments/status/${id}`);return r.data.data}});const deadline=data?.submittedAt?new Date(new Date(data.submittedAt).getTime()+6*3600000):new Date(Date.now()+6*3600000);const c=useCountdown(deadline);return <main className="container section"><h1>Payment status</h1><div className="card"><Badge tone={data?.status==='approved'?'green':data?.status==='rejected'?'red':'yellow'}>{data?.status||'No payment'}</Badge>{data?.status==='pending'&&<p>Verification countdown: {c.hours}h {c.minutes}m {c.seconds}s</p>}</div></main>}
