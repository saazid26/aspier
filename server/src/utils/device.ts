import type { Request } from 'express';

export function extractClientIp(req: Request | any): string {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req?.ip || req?.socket?.remoteAddress || '127.0.0.1';
}

export function parseUserAgent(uaString: string | undefined = ''): {
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  os: string;
  browser: string;
  userAgent: string;
} {
  const ua = uaString || '';
  let deviceType: 'Mobile' | 'Tablet' | 'Desktop' = 'Desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
    deviceType = 'Mobile';
  }

  let os = 'Unknown OS';
  if (/windows phone/i.test(ua)) os = 'Windows Phone';
  else if (/win(dows|98|nt|2000|xp|7|8|10|11)/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/ipad|iphone|ipod/i.test(ua)) os = 'iOS';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/cros/i.test(ua)) os = 'ChromeOS';

  let browser = 'Unknown Browser';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
  else if (/msie|trident/i.test(ua)) browser = 'Internet Explorer';

  return {
    deviceType,
    os,
    browser,
    userAgent: ua
  };
}
