import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { Table } from '../../../components/ui/Table';
export function StudentList(){const {data}=useQuery({queryKey:['admin-students'],queryFn:async()=>{const r=await api.get('/admin/students');return r.data.data}});return <><h1>Students</h1><Table headers={['Name','Email','Role','Active']}>{data?.map((x:any)=><tr key={x._id}><td>{x.name}</td><td>{x.email}</td><td>{x.role}</td><td>{x.isActive?'Yes':'No'}</td></tr>)}</Table></>}
