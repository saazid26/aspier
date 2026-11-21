import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { RichTextContent } from '../../components/common/RichTextContent';
export function MissionSection(){const {data}=useQuery({queryKey:['public-settings'],queryFn:async()=> (await api.get('/public/settings')).data.data});return <section className="section"><div className="container mission-panel"><span className="eyebrow">Our mission</span><h2>Rigorous inquiry, shared progress.</h2><RichTextContent className="muted" content={data?.missionText||'We connect disciplines, support emerging researchers, and turn knowledge into practical public impact.'}/></div></section>}
