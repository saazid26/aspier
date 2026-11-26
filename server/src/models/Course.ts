import { Schema, model } from 'mongoose';

const lessonSchema = new Schema({
  classNumber: Number,
  title: { type: String, required: true },
  order: { type: Number, default: 1 },
  topics: { type: [String], default: [] },
  videoUrl: { type: String, default: '' },
  youtubeVideoId: String,
  videoId: String,
  duration: { type: Schema.Types.Mixed, default: '60 mins' },
  resources: [String],
  isFreePreview: { type: Boolean, default: false }
}, { _id: true });

const moduleSchema = new Schema({
  title: { type: String, required: true },
  order: { type: Number, default: 1 },
  moduleNumber: Number,
  description: String,
  week: String,
  lessons: { type: [lessonSchema], default: [] }
}, { _id: true });

const instructorSubSchema = new Schema({
  name: { type: String, required: true },
  designationOrDetails: String,
  photoUrl: String,
  bio: String,
  researchGateUrl: { type: String, trim: true, default: '' },
  googleScholarUrl: { type: String, trim: true, default: '' },
  linkedInUrl: { type: String, trim: true, default: '' },
  orcidUrl: { type: String, trim: true, default: '' },
  websiteUrl: { type: String, trim: true, default: '' }
}, { _id: true });

const deliveryModeSetter = (value: unknown) => {
  if (value === 'Online / Live' || value === 'Online and Live') return 'Online and Live';
  if (value === 'In-Person Workshop' || value === 'Offline' || value === 'Offline (Physical)') return 'In-Person Workshop';
  return 'Online and Recorded';
};

const schema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: String,
  summary: String,
  duration: String,
  format: { type: String, default: 'Online and Recorded' },
  isRecorded: { type: Boolean, default: true },
  mode: {
    type: String,
    enum: ['Online and Recorded', 'Online and Live', 'In-Person Workshop'],
    set: deliveryModeSetter,
    get: deliveryModeSetter,
    default: 'Online and Recorded'
  },
  deliveryMode: {
    type: String,
    enum: ['Online and Recorded', 'Online and Live', 'In-Person Workshop'],
    set: deliveryModeSetter,
    get: deliveryModeSetter,
    default: 'Online and Recorded'
  },
  startDate: String,
  targetAudience: String,
  enrollmentContact: String,
  wingId: { type: Schema.Types.ObjectId, ref: 'Wing' },
  instructorId: { type: Schema.Types.ObjectId, ref: 'Instructor' },
  instructors: { type: [instructorSubSchema], default: [] },
  price: { type: Number, required: true, default: 0 },
  fee: { type: Number },
  thumbnail: String,
  bannerUrl: String,
  googleClassroomUrl: { type: String, trim: true, default: '' },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published', index: true },
  classes: { type: [lessonSchema], default: [] },
  curriculum: { type: [lessonSchema], default: [] },
  modules: { type: [moduleSchema], default: [] },
  sampleData: { type: Boolean, default: false }
}, { timestamps: true });

schema.pre('save', function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  if (!this.thumbnail && this.bannerUrl) this.thumbnail = this.bannerUrl;
  if (!this.bannerUrl && this.thumbnail) this.bannerUrl = this.thumbnail;
  if (!this.deliveryMode && this.mode) this.deliveryMode = this.mode;
  if (!this.mode && this.deliveryMode) this.mode = this.deliveryMode;
  if (this.fee !== undefined && this.fee !== null && (this.price === undefined || this.price === null)) {
    this.price = this.fee;
  }
  if (this.deliveryMode === 'Online and Recorded' || this.mode === 'Online and Recorded') {
    this.startDate = '';
  }
  next();
});

export default model('Course', schema);
