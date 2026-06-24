const { z } = require('zod');

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),

  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
    .max(150, 'Email is too long'),

  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email format'),

  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

const VALID_CONDITIONS = ['excellent', 'good', 'fair', 'poor'];
const currentYear = new Date().getFullYear();

const auctionBaseSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be at most 200 characters'),

  year: z.coerce
    .number({ required_error: 'Year is required', invalid_type_error: 'Year must be a number' })
    .int('Year must be a whole number')
    .min(1900, 'Year must be 1900 or later')
    .max(currentYear + 1, `Year can't be more than ${currentYear + 1}`),

  make: z
    .string({ required_error: 'Make is required' })
    .trim()
    .min(1, 'Make is required')
    .max(100, 'Make must be at most 100 characters'),

  model: z
    .string({ required_error: 'Model is required' })
    .trim()
    .min(1, 'Model is required')
    .max(100, 'Model must be at most 100 characters'),

  mileage: z.coerce
    .number({ required_error: 'Mileage is required', invalid_type_error: 'Mileage must be a number' })
    .int('Mileage must be a whole number')
    .min(0, 'Mileage cannot be negative'),

  condition: z.enum(VALID_CONDITIONS, {
    errorMap: () => ({ message: `Condition must be one of: ${VALID_CONDITIONS.join(', ')}` }),
  }),

  description: z
    .string()
    .max(5000, 'Description must be at most 5000 characters')
    .optional(),

  starting_bid: z.coerce
    .number({ required_error: 'Starting bid is required', invalid_type_error: 'Starting bid must be a number' })
    .positive('Starting bid must be greater than 0')
    .max(100_000_000, 'Starting bid is unrealistically large'),

  start_time: z
    .string({ required_error: 'Start time is required' })
    .datetime({ offset: true, message: 'Invalid start time format' })
    .or(z.string().refine(v => !isNaN(Date.parse(v)), 'Invalid start time')),

  end_time: z
    .string({ required_error: 'End time is required' })
    .datetime({ offset: true, message: 'Invalid end time format' })
    .or(z.string().refine(v => !isNaN(Date.parse(v)), 'Invalid end time')),

  images: z
    .array(
      z.string().url('Each image must be a valid URL').max(500, 'Image URL is too long')
    )
    .max(5, 'Maximum 5 images allowed')
    .optional(),
});

const auctionSchema = auctionBaseSchema.refine(
  (data) => new Date(data.end_time) > new Date(data.start_time),
  { message: 'End time must be after start time', path: ['end_time'] }
);

const updateAuctionSchema = auctionBaseSchema.partial().refine(
  (data) => {
    if (data.start_time && data.end_time) {
      return new Date(data.end_time) > new Date(data.start_time);
    }
    return true;
  },
  { message: 'End time must be after start time', path: ['end_time'] }
);

const placeBidSchema = z.object({
  amount: z.coerce
    .number({ required_error: 'Bid amount is required', invalid_type_error: 'Bid amount must be a number' })
    .positive('Bid amount must be greater than 0')
    .max(100_000_000, 'Bid amount is unrealistically large'),
});

function formatZodError(err) {
  const issues = err.issues || err.errors || [];
  return issues.map(e => e.message).join('. ');
}

module.exports = {
  registerSchema,
  loginSchema,
  auctionSchema,
  updateAuctionSchema,
  placeBidSchema,
  formatZodError,
};
