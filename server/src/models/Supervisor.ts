import { Schema, model } from 'mongoose';
const schema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  designation: String,
  affiliation: String,
  wingIds: [{ type: Schema.Types.ObjectId, ref: 'Wing' }],
  bio: String,
  photo: String,
  email: String,
  presentAddress: String,
  permanentAddress: String,
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
  researchInterests: [String],
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
export default model('Supervisor', schema);
