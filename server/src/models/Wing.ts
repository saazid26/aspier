import { Schema, model } from 'mongoose';
const schema = new Schema({ name: { type: String, required: true, trim: true }, slug: { type: String, required: true, unique: true, index: true }, shortDescription: String, description: String, disciplines: [String], objectives: { type: Schema.Types.Mixed, default: [] }, coverImage: String, order: { type: Number, default: 0 }, isActive: { type: Boolean, default: true, index: true } }, { timestamps: true });
export default model('Wing', schema);
