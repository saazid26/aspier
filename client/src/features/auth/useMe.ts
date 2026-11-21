import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
export type Me = { _id:string; id?:string; name:string; email:string; role:'student'|'instructor'|'admin'|'superadmin' } | null;
export function useMe(){const [me,setMe]=useState<Me>(undefined as unknown as Me);useEffect(()=>{api.get('/auth/me').then(r=>setMe(r.data.data)).catch(()=>setMe(null))},[]);return {me,loading:me===undefined,setMe}}
