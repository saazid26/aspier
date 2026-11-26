import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { SEO } from '../../components/common/SEO';
import { usePageSEO } from '../../hooks/usePageSEO';
import { RichTextContent } from '../../components/common/RichTextContent';
import { CoverMedia } from '../../components/common/CoverMedia';
import { staticWings } from '../../lib/staticData';

type Wing = {
  _id: string;
  slug: string;
  name: string;
  order: number;
  coverImage?: string;
  disciplines?: string[];
  shortDescription?: string;
};

function WingsPageSEO() {
  const wingsTitle = 'Interdisciplinary Research Groups in Climate, Hydrology, AI, Biotech & Engineering | ASPIER';
  const wingsDescription =
    'Explore 10 active research divisions covering Hydrology & Atmospheric Physics, Biotechnology, Aeronautical & Spatial Engineering, Geospatial AI, and Environmental Sustainability.';
  usePageSEO({
    title: wingsTitle,
    description: wingsDescription,
    path: '/wings'
  });
  return (
    <SEO
      title={wingsTitle}
      exact
      description={wingsDescription}
      keywords="interdisciplinary research groups Bangladesh, hydrology atmospheric physics research, biotechnology research lab, geospatial AI remote sensing, aeronautical spatial engineering research"
      canonicalPath="/wings"
      breadcrumbs={[
        { name: 'Home', path: '/' },
        { name: 'Wings', path: '/wings' }
      ]}
    />
  );
}

export function WingsGrid() {
  const location = useLocation();
  const isWingsPage = location.pathname === '/wings';
  const { data: remoteData, isError } = useQuery({
    queryKey: ['wings'],
    queryFn: async () => (await api.get('/public/wings')).data.data as Wing[],
    initialData: staticWings as Wing[],
  });

  const data = remoteData && remoteData.length > 0 ? remoteData : (staticWings as Wing[]);

  return <section className="section">
    {isWingsPage && <WingsPageSEO />}
    <div className="container">
      <div className="section-head"><div><span className="eyebrow">ASPIER Academic Wings</span><h1>Explore disciplines</h1></div></div>
      {isError && data.length === 0 && <p role="alert">Could not load academic wings. Please refresh to try again.</p>}
      <div className="grid wing-grid">{data.map((wing, index) => <Link className="card wing-card" key={wing._id || wing.slug} to={`/wings/${wing.slug}`}>
        <CoverMedia
          src={wing.coverImage}
          alt={`${wing.name} banner`}
          fallbackLabel={`Wing ${String(wing.order || index + 1).padStart(2, '0')} · ${wing.name}`}
          className="wing-card-media"
          imageClassName="wing-card-image"
          fallbackClassName="wing-image-placeholder"
        />
        <div className="wing-card-body">
          <span className="wing-number-badge">Wing {String(wing.order || index + 1).padStart(2, '0')}</span>
          <h2>{wing.name}</h2>
          <h3 className="wing-disciplines-title">Target Disciplines</h3>
          <div className="domain-list wing-discipline-pills">{(wing.disciplines || []).map((discipline) => <span className="domain-chip" key={discipline}>{discipline}</span>)}</div>
          {wing.shortDescription && <RichTextContent className="wing-summary" content={wing.shortDescription}/>}
        </div>
      </Link>)}</div>
    </div>
  </section>;
}
