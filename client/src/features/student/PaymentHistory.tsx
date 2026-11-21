import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
export function PaymentHistory(){const {data}=useQuery({queryKey:['payments-history'],queryFn:async()=>{const r=await api.get('/me/payments');return r.data.data}});return <><h1>Payment history</h1><Table headers={['Transaction','Method','Amount','Status']} >{data?.map((x:any)=><tr key={x._id}><td>{x.trxId}</td><td>{x.method}</td><td>৳{x.amount}</td><td><Badge tone={x.status==='approved'?'green':x.status==='rejected'?'red':'yellow'}>{x.status}</Badge></td></tr>)}</Table></>}
