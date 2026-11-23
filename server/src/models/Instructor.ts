import { Schema, model } from 'mongoose';

const schema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  title: String,
  designation: String,
  affiliation: String,
  bio: String,
  photo: String,
  avatar: String,
  avatarUrl: String,
  assignedCourseIds: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  expertise: [String],
  socialLinks: { twitter: String, linkedin: String, website: String },
  sampleData: { type: Boolean, default: false }
}, { timestamps: true });

schema.pre('save', function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  if (!this.title && this.designation) this.title = this.designation;
  if (!this.designation && this.title) this.designation = this.title;
  if (!this.photo && (this.avatar || this.avatarUrl)) this.photo = this.avatar || this.avatarUrl;
  if (!this.avatar && (this.photo || this.avatarUrl)) this.avatar = this.photo || this.avatarUrl;
  if (!this.avatarUrl && (this.photo || this.avatar)) this.avatarUrl = this.photo || this.avatar;
  next();
});

export default model('Instructor', schema);

