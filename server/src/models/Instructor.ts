import { Schema, model } from 'mongoose';
const schema = new Schema({ name: { type: String, required: true }, slug: { type: String, required: true, unique: true, index: true }, title: String, bio: String, photo: String, expertise: [String], socialLinks: { twitter: String, linkedin: String, website: String }, sampleData: { type: Boolean, default: false } }, { timestamps: true });
export default model('Instructor', schema);

