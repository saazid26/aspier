import { Schema, model, type Document } from 'mongoose';

export interface ICertificate extends Document {
  credentialId: string;
  studentName: string;
  studentEmail?: string;
  recipientRole: 'Student' | 'Instructor';
  studentId?: Schema.Types.ObjectId;
  enrollmentId?: Schema.Types.ObjectId;
  courseTitle: string;
  issueDate: Date;
  certificateImage: string;
  status: 'issued' | 'revoked';
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<ICertificate>(
  {
    credentialId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    studentName: {
      type: String,
      required: true,
      trim: true
    },
    studentEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined
    },
    recipientRole: {
      type: String,
      enum: ['Student', 'Instructor'],
      default: 'Student',
      index: true
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
      index: true
    },
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      default: undefined,
      index: true
    },
    courseTitle: {
      type: String,
      required: true,
      trim: true
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    certificateImage: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['issued', 'revoked'],
      default: 'issued',
      index: true
    }
  },
  { timestamps: true }
);

certificateSchema.index({ credentialId: 1, status: 1 });

export default model<ICertificate>('Certificate', certificateSchema);
