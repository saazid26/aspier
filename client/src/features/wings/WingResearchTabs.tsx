import { Tabs } from '../../components/ui/Tabs';
export function WingResearchTabs({active='Research',onChange}: {active?:string;onChange?:()=>void}){return <Tabs tabs={['Research','People','Courses']} active={active} onChange={() => onChange?.()}/>}
