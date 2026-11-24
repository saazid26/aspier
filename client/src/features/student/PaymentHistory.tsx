import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
export function PaymentHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['payments-history'],
    queryFn: async () => {
      const r = await api.get('/me/payments');
      const raw = r.data;
      return Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
    }
  });
  const payments = Array.isArray(data) ? data : Array.isArray((data as any)?.data) ? (data as any).data : [];
  return (
    <>
      <h1>Payment history</h1>
      {isLoading ? (
        <p className="muted">Loading payment records...</p>
      ) : payments.length === 0 ? (
        <p className="muted">No payments recorded yet.</p>
      ) : (
        <Table headers={['Transaction', 'Method', 'Amount', 'Status']}>
          {payments.map((x: any) => (
            <tr key={x._id}>
              <td>{x.trxId}</td>
              <td>{x.method}</td>
              <td>৳{x.amount}</td>
              <td>
                <Badge tone={x.status === 'approved' ? 'green' : x.status === 'rejected' ? 'red' : 'yellow'}>
                  {x.status}
                </Badge>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
