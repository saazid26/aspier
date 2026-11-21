import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { Table } from '../../../components/ui/Table';
export function MessageInbox(){const {data}=useQuery({queryKey:['messages'],queryFn:async()=>{const r=await api.get('/admin/messages');return r.data.data}});return <><h1>Messages</h1><Table headers={['Type','Name','Email','Status','Message']}>{data?.map((x:any)=><tr key={x._id}><td>{x.type}</td><td>{x.name}</td><td>{x.email}</td><td>{x.status}</td><td>{x.message}</td></tr>)}</Table></>}
