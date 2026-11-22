import { ImageUploader } from './ImageUploader';
import { RichTextEditor } from './RichTextEditor';
import { Button } from '../ui/Button';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
}

type DynamicField = {
  name: string;
  label: string;
  type?: string;
  imageHelp?: string;
  maxSizeMB?: number;
  shape?: 'circle' | 'banner';
  imageVariant?: 'circle' | 'cover';
  options?: Array<[string, string]>;
};

export function DynamicForm({ fields, value, onChange, onSubmit, submitting = false }: {
  fields: DynamicField[];
  value: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  onSubmit: (event: React.FormEvent) => void;
  submitting?: boolean;
}) {
  return <form className="form" onSubmit={onSubmit}>{fields.map((field) => {
    const current = value[field.name];
    if (field.type === 'image') {
      const imageValue = typeof current === 'string' ? current : '';
      const isBanner = field.shape === 'banner' || field.imageVariant === 'cover';
      return <div className="dynamic-image-field w-full max-w-full box-border" key={field.name}>
        <span className="dynamic-image-label">{field.label}</span>
        <ImageUploader
          value={imageValue}
          helperText={field.imageHelp || (isBanner ? 'Recommended: 800 × 450 px • 16:9 Ratio • Max 2MB' : 'Recommended: 400 × 400 px, 1:1 Square, Max 2MB')}
          maxSizeMB={field.maxSizeMB || 2}
          shape={isBanner ? 'banner' : 'circle'}
          onUploaded={(url) => onChange(field.name, url)}
        />
        {imageValue && !isBanner && <button className="button button-secondary" type="button" onClick={() => onChange(field.name, '')}>Remove image</button>}
      </div>;
    }
    if (field.type === 'textarea') return <label key={field.name}>{field.label}<textarea className="textarea" rows={4} value={String(current ?? '')} onChange={(event) => onChange(field.name, event.target.value)}/></label>;
    if (field.type === 'array') return <label key={field.name}>{field.label}<textarea className="textarea" rows={3} placeholder="Separate entries with commas" value={Array.isArray(current) ? current.join(', ') : String(current ?? '')} onChange={(event) => onChange(field.name, event.target.value.split(',').map((item) => item.trim()).filter(Boolean))}/></label>;
    if (field.type === 'richtext') {
      const richTextValue = Array.isArray(current) ? current.map((item) => `<p>${escapeHtml(String(item))}</p>`).join('') : String(current ?? '');
      return <label key={field.name}>{field.label}<RichTextEditor value={richTextValue} onChange={(value) => onChange(field.name, value)}/></label>;
    }
    if (field.type === 'select') return <label key={field.name}>{field.label}<select className="select" value={String(current ?? '')} onChange={(event) => onChange(field.name, event.target.value)}>{(field.options || []).map(([option, label]) => <option key={option} value={option}>{label}</option>)}</select></label>;
    if (field.type === 'boolean') return <label key={field.name} className="check-label">{field.label}<input type="checkbox" checked={Boolean(current)} onChange={(event) => onChange(field.name, event.target.checked)}/></label>;
    return <label key={field.name}>{field.label}<input className="input" type={field.type || 'text'} value={String(current ?? '')} onChange={(event) => onChange(field.name, field.type === 'number' ? Number(event.target.value) : event.target.value)}/></label>;
  })}
    <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save changes'}</Button>
  </form>;
}
