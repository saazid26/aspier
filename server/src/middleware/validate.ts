import type { ZodSchema } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { HttpError } from './error.js';
export const validate = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return next(new HttpError(400, result.error.issues.map((i) => i.message).join(', ')));
  req.body = result.data;
  next();
};
export const validateParams = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.params);
  if (!result.success) return next(new HttpError(400, 'Invalid request parameters'));
  next();
};

