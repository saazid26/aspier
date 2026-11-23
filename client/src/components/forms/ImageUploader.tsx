import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

export type ImageUploaderProps = {
  onUploaded: (url: string) => void;
  value?: string;
  helperText: string;
  maxSizeMB: number;
  shape?: 'circle' | 'banner';
  variant?: 'circle' | 'cover';
  endpoint?: string;
  headers?: Record<string, string>;
};

export function ImageUploader({
  onUploaded,
  value,
  helperText,
  maxSizeMB,
  shape,
  variant,
  endpoint = '/admin/media',
  headers
}: ImageUploaderProps) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(value || '');
  const [previewFailed, setPreviewFailed] = useState(false);
  const objectUrl = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedShape: 'circle' | 'banner' = shape || (variant === 'cover' ? 'banner' : 'circle');
  const isBanner = resolvedShape === 'banner';

  useEffect(() => {
    setPreview(value || '');
    setPreviewFailed(false);
  }, [value]);

  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  const clearObjectUrl = () => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = '';
    }
  };

  const removeImage = () => {
    clearObjectUrl();
    setPreview('');
    setPreviewFailed(false);
    onUploaded('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return <div className={`image-uploader ${isBanner ? 'image-uploader-cover' : 'image-uploader-circle'} w-full max-w-full box-border mx-auto`}>
    <div className={`image-upload-frame ${isBanner ? 'image-upload-frame-cover aspect-[16/9] w-full max-w-full rounded-xl object-cover mx-auto box-border' : 'image-upload-frame-circle'} ${busy ? 'is-uploading' : ''}`}>
      {preview && !previewFailed
        ? <img
          src={preview}
          alt="Selected image preview"
          loading="lazy"
          decoding="async"
          onError={() => setPreviewFailed(true)}
          className={isBanner ? 'w-full h-full object-cover rounded-xl' : 'w-full h-full object-cover rounded-full'}
        />
        : isBanner
          ? <div className="image-upload-empty-cover">
            <span className="image-upload-empty" aria-hidden="true">+</span>
            <strong>Click to upload banner image (16:9)</strong>
          </div>
          : <span className="image-upload-empty" aria-hidden="true">+</span>}
      {isBanner
        ? preview
          ? <div className="image-upload-actions">
            <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>Change Image</button>
            <button type="button" disabled={busy} onClick={removeImage}>Remove Image</button>
          </div>
          : <button
            className="image-upload-cover-trigger"
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >{busy ? 'Uploading…' : 'Select banner image'}</button>
        : <>
          <button
            className="image-upload-trigger"
            type="button"
            style={{ width: '100%', backgroundColor: '#0d363c', borderTop: '1px solid rgba(255,255,255,0.25)', zIndex: 10 }}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >{busy ? 'Uploading…' : preview ? 'Change image' : 'Upload image'}</button>
        </>}
    </div>
    <span className="muted image-upload-helper">{helperText}</span>
    <input ref={inputRef} className="image-upload-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async (event) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Choose a JPG, PNG, or WebP image.');
        input.value = '';
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`Image must be ${maxSizeMB}MB or smaller.`);
        input.value = '';
        return;
      }

      clearObjectUrl();
      objectUrl.current = URL.createObjectURL(file);
      setPreview(objectUrl.current);
      setPreviewFailed(false);
      setBusy(true);
      try {
        const form = new FormData();
        form.append('file', file);
        const response = await api.post(endpoint, form, { headers });
        clearObjectUrl();
        setPreview(response.data.data.url);
        setPreviewFailed(false);
        onUploaded(response.data.data.url);
        toast.success('Image uploaded. Save changes to publish it.');
      } catch (error: any) {
        clearObjectUrl();
        setPreview(value || '');
        setPreviewFailed(false);
        toast.error(error.response?.data?.message || 'Image upload failed');
        input.value = '';
      } finally {
        setBusy(false);
        input.value = '';
      }
    }}/>
  </div>;
}
