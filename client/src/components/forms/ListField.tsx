export function ListField({ value=[], onChange }: { value?:string[]; onChange:(v:string[])=>void }) {
  return <textarea className="textarea" rows={4} value={value.join('\n')} onChange={(e)=>onChange(e.target.value.split('\n').filter(Boolean))}/>;
}
