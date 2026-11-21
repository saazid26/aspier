import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { ImageUploader } from '../../../components/forms/ImageUploader';
import { ImageWithFallback } from '../../../components/common/ImageWithFallback';
export function MediaLibrary(){
  const {data=[],isLoading,isError,refetch}=useQuery({queryKey:['media'],queryFn:async()=> (await api.get('/admin/media')).data.data});
  return <><h1>Media library</h1><p className="muted">Upload images for banners, news, courses, and featured content. Upload previews use a centered circular frame; published banners retain their display aspect ratio.</p>
    <ImageUploader value="" onUploaded={async()=>{await refetch()}} helperText="Recommended: 400 × 400 px, 1:1 Square, Max 2MB" maxSizeMB={2}/>
    {isLoading&&<p role="status">Loading media…</p>}
    {isError&&<div role="alert" className="applicant-error-message">Could not load media. <button type="button" className="button button-secondary" onClick={()=>void refetch()}>Try again</button></div>}
    {!isLoading&&!isError&&!data.length&&<p className="muted">No uploaded media yet.</p>}
    <div className="grid" style={{marginTop:20}}>{data.map((item:any)=><div className="card" key={item._id}>
      <ImageWithFallback className="media-library-image" src={item.url} alt={item.filename} fallbackLabel="Image unavailable"/>
      <p className="muted">{item.filename}</p>
      <button type="button" className="button button-danger" onClick={async()=>{if(!window.confirm(`Permanently delete ${item.filename}?`))return;try{await api.delete(`/admin/media/${item._id}`);toast.success('Media deleted');await refetch()}catch(error:any){toast.error(error.response?.data?.message||'Could not delete media')}}}>Delete image</button>
    </div>)}</div>
  </>;
}
