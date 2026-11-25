import { Schema, model } from 'mongoose';

const schema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  role: { type: String, default: 'Founding Member' },
  designation: String,
  affiliation: String,
  bio: String,
  photo: String,
  order: { type: Number, default: 0, index: true },
  displayOrder: { type: Number, default: 0, index: true },
  email: String,
  educationalBackground: String,
  researchInterests: [String],
  googleScholar: String,
  researchGate: String,
  orcid: String,
  linkedin: String,
  twitter: String,
  github: String,
  facebook: String,
  website: String,
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
  sampleData: { type: Boolean, default: false }
}, { timestamps: true });

export default model('FoundingMember', schema);
