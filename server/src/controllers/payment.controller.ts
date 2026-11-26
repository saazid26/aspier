import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import Payment from '../models/Payment.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';
import { HttpError } from '../middleware/error.js';
import { activateEnrollment } from '../services/enrollment.service.js';
import { notifyAdmins, notifyMember } from '../services/notification.service.js';
import { sendEmail } from '../services/email.service.js';
import { env } from '../config/env.js';
export async function submitPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { courseId, method, senderNumber, trxId, amount } = req.body;
    const course = /^[0-9a-f]{24}$/i.test(String(courseId))
      ? await Course.findById(courseId)
      : await Course.findOne({ slug: courseId });
    if (!course) throw new HttpError(404, 'Course not found');
    if (course.status !== 'published') throw new HttpError(404, 'Course not found');
    if (amount !== course.price) throw new HttpError(400, 'Payment amount does not match the course price');
    if (await Payment.exists({ trxId })) throw new HttpError(409, 'This transaction ID has already been submitted');
    if (await Payment.exists({ userId: req.user._id, courseId: course._id, status: 'pending' })) throw new HttpError(409, 'A pending payment already exists for this course');
    if (await Enrollment.exists({ userId: req.user._id, courseId: course._id, status: { $in: ['active', 'approved', 'final_approved', 'completed'] } })) {
      throw new HttpError(409, 'You are already enrolled in this course');
    }
    const payment = await Payment.create({ userId: req.user._id, courseId: course._id, method, senderNumber, trxId: trxId.trim(), amount: course.price });
    await notifyAdmins({
      title: 'New course payment submission',
      body: `${req.user.name} submitted ${method} payment for ${course.title}; TrxID ${payment.trxId}.`,
      category: 'course-payment',
      link: '/admin/payments',
      applicantName: req.user.name,
      applicantEmail: req.user.email,
      referenceId: String(payment.trxId)
    });
    res.status(201).json({ success: true, data: payment });
  } catch (error) { next(error); }
}
export async function paymentStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const course = /^[0-9a-f]{24}$/i.test(String(req.params.courseId))
      ? await Course.findById(req.params.courseId)
      : await Course.findOne({ slug: req.params.courseId });
    const targetCourseId = course ? course._id : req.params.courseId;
    const payment = await Payment.findOne({ userId: req.user._id, courseId: targetCourseId }).sort({ submittedAt: -1 });
    if (!payment) throw new HttpError(404, 'Payment not found');
    res.json({ success: true, data: payment });
  } catch (error) { next(error); }
}
export async function paymentHistory(req: AuthRequest, res: Response) {
  try {
    const payments = await Payment.find({ userId: req.user._id }).sort({ submittedAt: -1 }).populate('courseId', 'title slug');
    res.json({ success: true, data: payments || [] });
  } catch {
    res.json({ success: true, data: [] });
  }
}
export async function paymentQueue(req: AuthRequest, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const filter: any = req.query.status ? { status: req.query.status } : {};
    const [items, total] = await Promise.all([
      Payment.find(filter).populate('userId', 'name email').populate('courseId', 'title price').sort({ submittedAt: -1 }).skip((page - 1) * limit).limit(limit),
      Payment.countDocuments(filter)
    ]);
    res.json({ success: true, data: items || [], pagination: { page, limit, total: total || 0, pages: Math.ceil((total || 0) / limit) } });
  } catch {
    res.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
  }
}
export async function approvePayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) throw new HttpError(404, 'Payment not found');
    if (payment.status !== 'pending') throw new HttpError(409, 'Payment has already been reviewed');
    const enrollment = await activateEnrollment(String(payment.userId), String(payment.courseId));
    payment.status = 'approved'; payment.reviewedAt = new Date(); payment.reviewedBy = req.user._id; payment.enrollmentId = enrollment?._id;
    await payment.save();
    const [user, course] = await Promise.all([User.findById(payment.userId), Course.findById(payment.courseId)]);
    const clientBase = (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('localhost'))
      ? process.env.CLIENT_URL.replace(/\/$/, '')
      : (env.CLIENT_URL && !env.CLIENT_URL.includes('localhost')
        ? env.CLIENT_URL.replace(/\/$/, '')
        : 'https://aspierglobal.vercel.app');
    if (user) {
      const classroomNote = course?.googleClassroomUrl
        ? ` You can also join Google Classroom directly (${course.googleClassroomUrl}) from your Student Portal.`
        : '';
      await notifyMember({
        userId: user._id,
        title: 'Enrollment Confirmed — Course Access Unlocked!',
        body: `Your payment for ${course?.title || 'your course'} is approved! Private YouTube class access will be delivered to your registered email within 6 to 12 hours.${classroomNote}`,
        category: 'course-payment-approved',
        link: course?.googleClassroomUrl || '/academy/student'
      });
      await sendEmail({
        to: user.email,
        subject: `Enrollment Confirmed: ${course?.title || 'ASPIER Academy Course'}`,
        html: `<p>Hello ${user.name},</p><p>Your payment for <strong>${course?.title || 'your course'}</strong> has been approved!</p><p><strong>Private YouTube class access will be delivered to your registered email within 6 to 12 hours.</strong></p>${course?.googleClassroomUrl ? `<p><a href="${course.googleClassroomUrl}" style="background:#0f766e;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Join Google Classroom →</a></p>` : ''}<p>Visit your Student Portal: <a href="${clientBase}/academy/student">${clientBase}/academy/student</a></p>`
      });
    }
    res.json({ success: true, data: payment });
  } catch (error) { next(error); }
}
export async function rejectPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) throw new HttpError(404, 'Payment not found');
    if (payment.status !== 'pending') throw new HttpError(409, 'Payment has already been reviewed');
    payment.status = 'rejected'; payment.reviewedAt = new Date(); payment.reviewedBy = req.user._id; payment.rejectionReason = String(req.body.reason || 'Payment rejected');
    await payment.save();
    await Enrollment.findOneAndUpdate({ userId: payment.userId, courseId: payment.courseId }, { $set: { status: 'rejected' } });
    const [user, course] = await Promise.all([User.findById(payment.userId), Course.findById(payment.courseId)]);
    const clientBase = (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('localhost'))
      ? process.env.CLIENT_URL.replace(/\/$/, '')
      : (env.CLIENT_URL && !env.CLIENT_URL.includes('localhost')
        ? env.CLIENT_URL.replace(/\/$/, '')
        : 'https://aspierglobal.vercel.app');
    if (user) {
      await notifyMember({
        userId: user._id,
        title: 'Course payment rejected',
        body: `Your payment for ${course?.title || 'your course'} was rejected. Reason: ${payment.rejectionReason}`,
        category: 'course-payment-rejected',
        link: '/student/payments'
      });
      await sendEmail({
        to: user.email,
        subject: `Payment Update: ${course?.title || 'ASPIER Academy Course'}`,
        html: `<p>Hello ${user.name},</p><p>Your payment submission for <strong>${course?.title || 'your course'}</strong> could not be verified.</p><p><strong>Reason:</strong> ${payment.rejectionReason}</p><p>Please review your payment information or submit a new transaction at <a href="${clientBase}/student/payments">Payment History</a>.</p>`
      });
    }
    res.json({ success: true, data: payment });
  } catch (error) { next(error); }
}
