import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || env.CLOUDINARY_CLOUD_NAME || 'w9zgpjap';
const api_key = process.env.CLOUDINARY_API_KEY || env.CLOUDINARY_API_KEY || '519468336856738';
const api_secret = process.env.CLOUDINARY_API_SECRET || env.CLOUDINARY_API_SECRET || 'OFdCbZUTHo21IPWV8bRtkw4T4ms';

cloudinary.config({
  cloud_name,
  api_key,
  api_secret,
  secure: true
});

export const cloudinaryEnabled = Boolean(cloud_name && api_key && api_secret);
export { cloudinary };


