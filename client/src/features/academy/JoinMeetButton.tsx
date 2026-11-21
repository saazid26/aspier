import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
export function JoinMeetButton({classId}:{classId:string}){const [busy,setBusy]=useState(false);return <Button disabled={busy} onClick={async()=>{setBusy(true);try{const r=await api.get(`/academy/classes/${classId}/join`);window.open(r.data.data.meetLink,'_blank','noopener,noreferrer')}catch(e:any){toast.error(e.response?.data?.message||'Meet unavailable')}finally{setBusy(false)}}}>Join live class</Button>}
