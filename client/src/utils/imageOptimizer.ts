export interface ImageOptimizerOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/webp' | 'image/jpeg' | 'image/png';
}

/**
 * Universal client-side image compression.
 * Downscales images to maxWidth (default 1400px) while maintaining aspect ratio,
 * and encodes to WebP (quality 0.82) to ensure uploads stay well under 300KB.
 */
export async function optimizeImageForUpload(
  file: File,
  options: ImageOptimizerOptions = {}
): Promise<File> {
  const {
    maxWidth = 1400,
    maxHeight = 1400,
    quality = 0.82,
    format = 'image/webp'
  } = options;

  // If not a raster image or already tiny SVG / GIF animation, return unchanged
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      // If already within target dimensions and under 300KB and already WebP, return as-is
      if (width <= maxWidth && height <= maxHeight && file.size < 300 * 1024 && file.type === 'image/webp') {
        resolve(file);
        return;
      }

      // Proportional downsampling
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d', { alpha: true });

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Determine optimal output format (WebP with fallback)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const extension = format === 'image/webp' ? 'webp' : format === 'image/jpeg' ? 'jpg' : 'png';
          const optimizedFile = new File([blob], `${baseName}.${extension}`, {
            type: format,
            lastModified: Date.now()
          });
          resolve(optimizedFile);
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Asynchronously converts a File or Blob into a Base64 data URL string.
 */
export async function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
