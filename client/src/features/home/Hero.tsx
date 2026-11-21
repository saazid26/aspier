import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { RichTextContent } from '../../components/common/RichTextContent';

export function Hero() {
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => (await api.get('/public/settings')).data.data
  });
  const imageUrl = typeof settings?.heroImage === 'string' ? settings.heroImage : '';
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [imageUrl]);
  const showImage = Boolean(imageUrl && !imageFailed);

  return <section className="hero"><div className="container hero-grid">
    <div>
      <span className="eyebrow">Aeronautical · Spatial · Planetary · Environmental Research</span>
      <h1 className="gradient-text">{settings?.heroTitle || 'Research for our planet and beyond'}</h1>
      <RichTextContent className="hero-subtitle" content={settings?.heroSubtitle || 'The Aeronautical, Spatial, Planetary Institute for Environmental Research advances discovery across Earth and space.'}/>
      <div style={{display:'flex',gap:'10px',marginTop:'24px'}}>
        <Link className="button button-primary" to="/wings">Explore wings</Link>
        <Link className="button button-secondary" to="/academy">Visit academy</Link>
      </div>
    </div>
    <div className={`hero-art ${showImage ? 'has-image' : ''}`} aria-label={showImage ? 'ASPIER featured image' : 'Abstract ASPIER research artwork'}>
      {showImage
        ? <img src={imageUrl} alt="ASPIER featured research" decoding="async" onError={() => setImageFailed(true)}/>
        : <div className="hero-artwork" aria-hidden="true"><span className="art-orbit orbit-one"/><span className="art-orbit orbit-two"/><span className="art-sun"/><span className="art-dot dot-one"/><span className="art-dot dot-two"/><span className="art-dot dot-three"/></div>}
    </div>
  </div></section>;
}
