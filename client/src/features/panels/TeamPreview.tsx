import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export function TeamPreview() {
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => (await api.get('/public/settings')).data.data
  });

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow">{settings?.teamPreviewEyebrow || 'ASPIER Team'}</span>
            <h2>{settings?.teamPreviewTitle || 'Supervisors & Young Scholars'}</h2>
          </div>
          <Link className="button button-secondary" to="/team">Explore Team</Link>
        </div>
        <div className="cta-band">
          <div>
            <h3 style={{ marginTop: 0 }}>{settings?.teamPreviewBannerHeadline || 'Research guidance, collaborative discovery'}</h3>
            <p className="muted">{settings?.teamPreviewBannerSubtext || 'Meet the academic leaders and emerging researchers advancing work across our ten wings.'}</p>
          </div>
          <Link className="button button-primary" to="/team#supervisors">Meet Supervisors</Link>
          <Link className="button button-secondary" to="/team#young-scholars">Meet Young Scholars</Link>
        </div>
      </div>
    </section>
  );
}
