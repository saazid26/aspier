import { Button } from '../ui/Button';
export function Pagination({page,pages,onPage}:{page:number;pages:number;onPage:(page:number)=>void}){return <div className="pagination"><Button variant="secondary" disabled={page<=1} onClick={()=>onPage(page-1)}>Previous</Button><Button variant="secondary" disabled={page>=pages} onClick={()=>onPage(page+1)}>Next</Button></div>}
