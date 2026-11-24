import React from 'react';
import { SmoothImageUploader, type SmoothImageUploaderProps } from '../SmoothImageUploader';

export type ImageUploaderProps = SmoothImageUploaderProps;

export function ImageUploader(props: ImageUploaderProps) {
  return <SmoothImageUploader {...props} />;
}

export default ImageUploader;
