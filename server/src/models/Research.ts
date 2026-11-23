import { Schema, model } from 'mongoose';
const schema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  wingId: { type: Schema.Types.ObjectId, ref: 'Wing', index: true },
  category: { type: String, enum: ['ongoing', 'present', 'past', 'future'], default: 'ongoing', index: true },
  abstract: String,
  content: String,
  objectives: String,
  publicationUrl: String,
  doiUrl: String,
  showReadPaperButton: { type: Boolean, default: true },
  status: { type: String, enum: ['draft', 'under_review', 'published', 'ongoing', 'archived'], default: 'published', index: true },
  authors: [String],
  supervisors: [String],
  linkedTeamMembers: [{ type: Schema.Types.Mixed }],
  pdfUrl: String,
  coverImage: String,
  publishedAt: Date,
  featured: { type: Boolean, default: false, index: true },
  sampleData: { type: Boolean, default: false }
}, { timestamps: true });
export default model('Research', schema);
