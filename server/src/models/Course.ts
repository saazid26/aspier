import { Schema, model } from 'mongoose';
const lessonSchema = new Schema({ title: { type: String, required: true }, order: { type: Number, required: true }, youtubeVideoId: String, duration: { type: Number, default: 0 }, resources: [String], isFreePreview: { type: Boolean, default: false } }, { _id: true });
const moduleSchema = new Schema({ title: { type: String, required: true }, order: { type: Number, required: true }, lessons: { type: [lessonSchema], default: [] } }, { _id: true });
const deliveryModeSetter = (value: unknown) => {
  if (value === 'Online / Live') return 'Online and Live';
  return value;
};
const schema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: String,
  duration: String,
  mode: { type: String, enum: ['Online and Live', 'Online and Recorded', 'Offline'], set: deliveryModeSetter, default: 'Online and Live' },
  deliveryMode: { type: String, enum: ['Online and Live', 'Online and Recorded', 'Offline'], set: deliveryModeSetter },
  startDate: String,
  targetAudience: String,
  enrollmentContact: String,
  wingId: { type: Schema.Types.ObjectId, ref: 'Wing' },
  instructorId: { type: Schema.Types.ObjectId, ref: 'Instructor' },
  price: { type: Number, required: true, default: 0 },
  thumbnail: String,
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  modules: { type: [moduleSchema], default: [] },
  sampleData: { type: Boolean, default: false }
}, { timestamps: true });
export default model('Course', schema);
