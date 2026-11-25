export type Role = 'student' | 'instructor' | 'admin' | 'superadmin';
export type ResearchStatus = 'draft' | 'under_review' | 'published';
export type EnrollmentStatus = 'pending' | 'active' | 'rejected' | 'expired';
export type CertificateStatus = 'not_claimed' | 'claimed' | 'issued';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type ClassStatus = 'scheduled' | 'live' | 'completed';
export type MessageStatus = 'unread' | 'read' | 'archived';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'draft' | 'published' | 'archived';
export interface MembershipApplicationData {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  wing?: string;
  role: 'supervisor' | 'youngScholar';
  education?: string;
  educationalBackground?: string;
  researchDomain?: string;
  researchDomains?: string[];
  statement?: string;
  status?: string;
}
export interface ApiResponse<T = unknown> { success: boolean; data?: T; message?: string; pagination?: { page: number; limit: number; total: number; pages: number } }

