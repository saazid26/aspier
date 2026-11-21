import { useEffect, useState } from 'react';
import { api } from '../lib/api';
export function useCsrf(){const [ready,setReady]=useState(false);useEffect(()=>{api.get('/auth/csrf-token').finally(()=>setReady(true))},[]);return ready}
