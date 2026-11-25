import { Schema, model } from 'mongoose';
const schema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  cohort: String,
  wingId: { type: Schema.Types.ObjectId, ref: 'Wing' },
  bio: String,
  photo: String,
  presentAddress: String,
  permanentAddress: String,
  designation: String,
  affiliation: String,
  educationalBackground: String,
  education: String,
  googleScholar: String,
  researchGate: String,
  orcid: String,
  linkedin: String,
  twitter: String,
  github: String,
  facebook: String,
  website: String,
  researchTopics: [String],
  socialLinks: {
    googleScholar: String,
    researchGate: String,
    orcid: String,
    linkedin: String,
    twitter: String,
    github: String,
    facebook: String,
    website: String
  },
  sampleData: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  order: { type: Number, default: 0, index: true },
  displayOrder: { type: Number, default: 0, index: true }
}, { timestamps: true });
export default model('Scholar', schema);
