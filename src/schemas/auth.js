import { z } from 'zod';

const email = z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.').max(100, 'Email must be 100 characters or fewer.');
const password = z.string().min(8, 'Use at least 8 characters.').max(72, 'Password must be 72 characters or fewer.')
  .regex(/[A-Za-z]/, 'Include at least one letter.').regex(/[0-9]/, 'Include at least one number.');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.')
});

export const registerSchema = z.object({
  email,
  password,
  confirmPassword: z.string().min(1, 'Confirm your password.')
}).refine((values) => values.password === values.confirmPassword, {
  path: ['confirmPassword'], message: 'Passwords do not match.'
});

export const personalSettingsSchema = z.object({
  patientName: z.string().trim().min(1, 'Full name is required.').max(60, 'Use 60 characters or fewer.'),
  patientBday: z.string().min(1, 'Birthday is required.').refine(isValidDate, 'Enter a valid date between 1900 and today.'),
  patientSex: z.enum(['M', 'F'], { required_error: 'Choose a sex.' }),
  patientRel: z.string().trim().min(1, 'Religion is required.').max(60, 'Use 60 characters or fewer.'),
  patientMarStat: z.enum(['single', 'married', 'separated', 'divorced', 'widowed'])
});

export const accountSettingsSchema = z.object({
  email,
  phone: z.string().trim().max(20, 'Phone must be 20 characters or fewer.').refine((v) => !v || /^[0-9+()\s-]{7,20}$/.test(v), 'Use 7–20 digits, spaces, +, parentheses, or dashes.'),
  currentPassword: z.string().min(1, 'Enter your current password to save account changes.'),
  newPassword: z.string().max(72).optional().or(z.literal(''))
}).superRefine((values, ctx) => {
  if (values.newPassword && (values.newPassword.length < 8 || !/[A-Za-z]/.test(values.newPassword) || !/[0-9]/.test(values.newPassword))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['newPassword'], message: 'Use at least 8 characters with a letter and a number.' });
  }
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Enter your password.'),
  confirmation: z.string().refine((v) => v === 'DELETE', 'Type DELETE to confirm account deletion.')
});

export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '1900-01-01' && value <= new Date().toISOString().slice(0, 10);
}
