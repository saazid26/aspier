import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { Table } from '../../../components/ui/Table';

export function StudentList() {
  const { data = [] } = useQuery({
    queryKey: ['admin-students'],
    queryFn: async () => {
      const r = await api.get('/admin/students');
      return r.data.data;
    }
  });

  return (
    <>
      <h1>Students</h1>
      <Table headers={['Name', 'Email', 'Role', 'Active']}>
        {data && data.length > 0 ? (
          data.map((x: any) => (
            <tr key={x._id}>
              <td>{x.name}</td>
              <td>{x.email}</td>
              <td>{x.role}</td>
              <td>{x.isActive ? 'Yes' : 'No'}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={4} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
              No students registered yet.
            </td>
          </tr>
        )}
      </Table>
    </>
  );
}
