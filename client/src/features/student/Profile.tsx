import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Trash2,
  Save,
  User,
  Mail,
  Phone,
  GraduationCap,
  Building,
  Award,
  Hash,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  Orbit,
  Lock,
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMe } from '../auth/useMe';
import { ChangePassword } from '../auth/ChangePassword';
import { api, getApiErrorMessage } from '../../lib/api';
import { SmoothImageUploader } from '../../components/SmoothImageUploader';

export function Profile() {
  const { me, updateMe, loading } = useMe();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    university: '',
    department: '',
    academicLevel: '',
    studentId: '',
    city: '',
    bio: '',
    avatarUrl: ''
  });

  const [previewAvatar, setPreviewAvatar] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // Pre-fill inputs with student's live profile data
  useEffect(() => {
    if (me) {
      setFormData({
        name: me.name || me.fullName || '',
        email: me.email || '',
        phone: me.phone || '',
        university: me.university || me.institution || '',
        department: me.department || '',
        academicLevel: me.academicLevel || me.session || '',
        studentId: me.studentId || me.rollNumber || '',
        city: me.city || '',
        bio: me.bio || '',
        avatarUrl: me.avatarUrl || me.avatar || ''
      });
      setPreviewAvatar(me.avatarUrl || me.avatar || '');
    }
  }, [me]);

  // Initials generator for fallback avatar
  const getInitials = (name?: string) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Handle Photo File selection and upload
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Profile photo must be less than 2MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG, or WebP images are permitted');
      return;
    }

    // Instant client-side preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewAvatar(dataUrl);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setIsUploadingPhoto(true);
    setSaveError('');
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await api.post('/auth/profile/avatar', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const photoUrl = res.data?.data?.avatarUrl || res.data?.data?.url || res.data?.avatarUrl || res.data?.url;
      setFormData((prev) => ({ ...prev, avatarUrl: photoUrl }));
      setPreviewAvatar(photoUrl);
      updateMe({ avatar: photoUrl, avatarUrl: photoUrl });
      toast.success('Profile photo updated successfully!');
    } catch (err: any) {
      // Fallback: keep preview data URL and save with profile
      const dataUrl = previewAvatar;
      if (dataUrl && dataUrl.startsWith('data:image/')) {
        setFormData((prev) => ({ ...prev, avatarUrl: dataUrl }));
        updateMe({ avatar: dataUrl, avatarUrl: dataUrl });
        toast.success('Photo preview ready. Click "Save Profile Changes" to persist.');
      } else {
        toast.error(getApiErrorMessage(err, 'Failed to upload photo'));
      }
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setPreviewAvatar('');
    setFormData((prev) => ({ ...prev, avatarUrl: '' }));
    updateMe({ avatar: '', avatarUrl: '' });
    toast.success('Profile photo removed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');

    if (!formData.name.trim()) {
      setSaveError('Please enter your full name');
      return;
    }
    if (!formData.email.trim()) {
      setSaveError('Please enter a valid email address');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        fullName: formData.name.trim(),
        avatar: formData.avatarUrl || previewAvatar || '',
        avatarUrl: formData.avatarUrl || previewAvatar || ''
      };

      const res = await api.patch('/auth/profile', payload);
      const updatedUser = res.data?.data || res.data;
      updateMe(updatedUser);
      setSaveSuccess('Your profile changes have been saved successfully.');
      toast.success('Profile updated successfully!');
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Could not save profile changes.');
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-12">
      {/* Page Title & Breadcrumb */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Student Profile
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage your personal information, academic credentials, and account settings.
        </p>
      </div>

      {/* 1. INTERACTIVE STUDENT PROFILE FORM CARD */}
      <section className="w-full rounded-2xl bg-white border border-slate-200/90 shadow-sm p-4 sm:p-6 lg:p-8 box-border">
        {/* Live Header Summary & 1:1 Circular Profile Photo Uploader */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 mb-6 border-b border-slate-200">
          {/* Avatar Container with Smooth Drag-and-Drop Uploader */}
          <div className="shrink-0 flex flex-col items-center">
            <SmoothImageUploader
              value={formData.avatarUrl || previewAvatar}
              onChange={(url) => {
                setFormData((prev) => ({ ...prev, avatarUrl: url }));
                setPreviewAvatar(url);
                updateMe({ avatar: url, avatarUrl: url });
              }}
              onRemove={() => {
                setFormData((prev) => ({ ...prev, avatarUrl: '' }));
                setPreviewAvatar('');
                updateMe({ avatar: '', avatarUrl: '' });
              }}
              endpoint="/auth/profile/avatar"
              shape="circle"
              helperText="1:1 Circle • Drag & Drop or Click + (Max 10MB)"
            />
          </div>

          {/* User Details & Status */}
          <div className="flex-1 text-center sm:text-left min-w-0 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                  {formData.name || 'Student Name'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 truncate font-mono">
                  {formData.email || 'student@domain.edu'}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 self-center sm:self-start px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 uppercase tracking-wider">
                <User className="w-3.5 h-3.5" />
                <span>{me?.role === 'student' ? 'Student Member' : me?.role || 'Student'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Profile picture is synchronized with your student dashboard, discussion forums, and verified credentials.
            </p>
          </div>
        </div>

        {/* Inline Alerts */}
        {saveSuccess && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {saveError && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        )}

        {/* 2. Comprehensive Student Information Form Grid */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Full Name */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Full Name <span className="text-rose-500">*</span></span>
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border text-slate-900 placeholder:text-slate-400"
                placeholder="e.g. Abdullah Al Mamun"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Email Address <span className="text-rose-500">*</span></span>
              </label>
              <input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border text-slate-900 placeholder:text-slate-400"
                placeholder="e.g. student@gmail.com"
              />
            </div>

            {/* Mobile / WhatsApp Number */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Mobile / WhatsApp Number <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border text-slate-900 placeholder:text-slate-400 font-mono"
                placeholder="e.g. +880 1711-223344"
              />
            </div>

            {/* University / Institution */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <span>University / Institution <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                value={formData.university}
                onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border text-slate-900 placeholder:text-slate-400"
                placeholder="e.g. University of Rajshahi, BUET, DU"
              />
            </div>

            {/* Department */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Department <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border text-slate-900 placeholder:text-slate-400"
                placeholder="e.g. Computer Science & Engineering, Physics"
              />
            </div>

            {/* Academic Level / Year & Session */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                <span>Academic Level / Year &amp; Session</span>
              </label>
              <input
                type="text"
                value={formData.academicLevel}
                onChange={(e) => setFormData({ ...formData, academicLevel: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border text-slate-900 placeholder:text-slate-400"
                placeholder="e.g. B.Sc. 3rd Year (2022–23)"
              />
            </div>

            {/* Student ID / Roll (Optional) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>Student ID / Roll (Optional)</span>
              </label>
              <input
                type="text"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border text-slate-900 placeholder:text-slate-400 font-mono"
                placeholder="e.g. 2010876123"
              />
            </div>

            {/* City / District (Optional) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>City / District (Optional)</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border text-slate-900 placeholder:text-slate-400"
                placeholder="e.g. Rajshahi, Dhaka, Chittagong"
              />
            </div>

            {/* Short Bio / Academic Interests (Full Width) */}
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Short Bio &amp; Academic Interests</span>
              </label>
              <textarea
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full p-3.5 text-base sm:text-sm rounded-xl border border-slate-300 bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 box-border text-slate-900 placeholder:text-slate-400 resize-y leading-relaxed"
                placeholder="Tell us about your academic background, research interests, or goals in ASPIER Academy…"
              />
            </div>
          </div>

          {/* Form Action Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 order-2 sm:order-1 text-center sm:text-left">
              Changes reflect immediately on your dashboard, courses, and certificates.
            </p>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 order-1 sm:order-2 text-sm"
            >
              {isSaving ? (
                <>
                  <Orbit className="w-4 h-4 animate-spin" />
                  <span>Saving Profile…</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* 2. LOWER SECURITY SECTION (PRESERVED) */}
      <section className="w-full rounded-2xl bg-white border border-slate-200/90 shadow-sm p-4 sm:p-6 lg:p-8 box-border">
        <div className="border-b border-slate-200 pb-4 mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2 m-0">
            <Lock className="w-5 h-5 text-teal-700" />
            <span>Security Settings</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 m-0">
            Change your password to keep your student account secure.
          </p>
        </div>
        <ChangePassword />
      </section>
    </div>
  );
}
