import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { Table } from '../../../components/ui/Table';
export function AuditLog(){const {data}=useQuery({queryKey:['audit'],queryFn:async()=>{const r=await api.get('/admin/audit');return r.data.data}});return <><h1>Audit log</h1><Table headers={['Action','Resource','Actor','Time']}>{data?.map((x:any)=><tr key={x._id}><td>{x.action}</td><td>{x.resource}</td><td>{x.actorId?.name||x.actorId?.email||'System'}</td><td>{new Date(x.createdAt).toLocaleString()}</td></tr>)}</Table></>}
