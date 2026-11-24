export interface Certificate {
  _id?: string;
  id?: string;
  credentialId: string;
  studentName: string;
  studentEmail?: string;
  studentId?: string;
  enrollmentId?: string;
  courseTitle: string;
  issueDate: string | Date;
  certificateImage: string;
  status: 'issued' | 'revoked';
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CertificateVerificationResult {
  valid: boolean;
  message?: string;
  certificate?: {
    credentialId: string;
    studentName: string;
    courseTitle: string;
    issueDate: string;
    imageUrl: string;
  };
}
