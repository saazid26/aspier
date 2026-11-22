import { Link } from 'react-router-dom';
import { CoverMedia } from '../../components/common/CoverMedia';
type ResearchCardItem = { slug: string; title: string; abstract?: string; coverImage?: string; featured?: boolean; sampleData?: boolean };
export function ResearchCard({item}:{item:ResearchCardItem}){
  return <Link className="card image-card research-card" to={`/research/${item.slug}`}>
    <CoverMedia src={item.coverImage} alt={`${item.title} cover`} fallbackLabel="Research project" className="research-card-image" fallbackClassName="research-cover-placeholder"/>
    <div className="research-card-body">
      <span className="eyebrow">{item.sampleData?'Sample research':item.featured?'Featured research':'Research'}</span>
      <h3>{item.title}</h3>
      <p className="muted">{item.abstract}</p>
    </div>
  </Link>;
}
