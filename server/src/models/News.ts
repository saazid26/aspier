import { Schema, model } from 'mongoose';
const schema = new Schema({ title: { type: String, required: true }, slug: { type: String, required: true, unique: true, index: true }, excerpt: String, content: String, coverImage: String, category: { type: String, default: 'News' }, isAnnouncement: { type: Boolean, default: false, index: true }, publishedAt: Date, sampleData: { type: Boolean, default: false } }, { timestamps: true });
export default model('News', schema);

