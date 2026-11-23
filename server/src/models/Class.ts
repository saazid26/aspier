import { Schema, model } from 'mongoose';

const schema = new Schema({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  title: { type: String },
  topic: { type: String },
  description: String,
  scheduledAt: { type: Date, required: true, index: true },
  durationMinutes: { type: Number, default: 60 },
  meetLinkEncrypted: { type: String, select: false },
  meetLink: String,
  meetingUrl: String,
  liveJoinUrl: String,
  recordingYoutubeId: String,
  recordingUrl: String,
  venue: String,
  mode: { type: String, enum: ['Online and Live', 'Online and Recorded', 'Offline'], default: 'Online and Live' },
  status: { type: String, enum: ['scheduled', 'live', 'completed'], default: 'scheduled', index: true }
}, { timestamps: true });

schema.pre('save', function (next) {
  if (!this.title && this.topic) this.title = this.topic;
  if (!this.topic && this.title) this.topic = this.title;
  if (!this.meetLink && this.meetingUrl) this.meetLink = this.meetingUrl;
  if (!this.meetingUrl && this.meetLink) this.meetingUrl = this.meetLink;
  if (!this.liveJoinUrl && (this.meetLink || this.meetingUrl)) this.liveJoinUrl = this.meetLink || this.meetingUrl;
  if (!this.recordingUrl && this.recordingYoutubeId) this.recordingUrl = this.recordingYoutubeId;
  if (!this.recordingYoutubeId && this.recordingUrl) this.recordingYoutubeId = this.recordingUrl;
  next();
});

export default model('Class', schema);

