import { z } from 'zod';
import type { H3Event } from 'h3';

// MongoDB ObjectId validation
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid MongoDB ObjectId');

// ISBN13 validation
const isbn13Regex = /^\d{13}$/;
export const isbn13Schema = z.string().regex(isbn13Regex, 'ISBN13 must be exactly 13 digits');

// Common field schemas
export const bookFieldSchemas = {
  isbn13: isbn13Schema,
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  authors: z.string().min(1, 'Authors is required').max(500, 'Authors must be 500 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
  thumbnail: z.string().url('Thumbnail must be a valid URL'),
  stock: z.number().int('Stock must be an integer').min(0, 'Stock cannot be negative'),
  published_year: z.number().int('Published year must be an integer')
    .min(1000, 'Published year must be after 1000')
    .max(new Date().getFullYear(), 'Published year cannot be in the future')
    .optional(),
  average_rating: z.number()
    .min(0, 'Rating must be at least 0')
    .max(5, 'Rating must be at most 5')
    .optional(),
  num_pages: z.number().int('Number of pages must be an integer').positive('Number of pages must be positive').optional(),
  ratings_count: z.number().int('Ratings count must be an integer').min(0, 'Ratings count cannot be negative').optional(),
};

// Book schemas
export const bookDetailsSchema = z.object({
  isbn13: bookFieldSchemas.isbn13,
  title: bookFieldSchemas.title,
  authors: bookFieldSchemas.authors,
  description: bookFieldSchemas.description,
  published_year: bookFieldSchemas.published_year,
  average_rating: bookFieldSchemas.average_rating,
  num_pages: bookFieldSchemas.num_pages,
  ratings_count: bookFieldSchemas.ratings_count,
  thumbnail: bookFieldSchemas.thumbnail,
  stock: bookFieldSchemas.stock,
});

export const bookWithIdSchema = bookDetailsSchema.extend({
  _id: objectIdSchema,
});

// Request body schemas
export const createBooksSchema = z.object({
  books: z.array(bookDetailsSchema)
    .min(1, 'At least one book is required')
    .max(100, 'Cannot create more than 100 books at once'),
});

export const editBookSchema = z.object({
  book: bookWithIdSchema,
});

export const deleteBookIdsSchema = z.object({
  ids: z.array(objectIdSchema)
    .min(1, 'At least one ID is required')
    .max(100, 'Cannot delete more than 100 books at once'),
});

export const borrowReturnSchema = z.object({
  books: z.array(z.object({
    book: objectIdSchema,
    timestamp: z.string().datetime('Invalid timestamp format'),
  }))
    .min(1, 'At least one book is required')
    .max(10, 'Cannot borrow/return more than 10 books at once'),
});

// Query parameter schemas
export const paginationSchema = z.object({
  skip: z.coerce.number()
    .int('Skip must be an integer')
    .min(0, 'Skip cannot be negative')
    .optional()
    .default(0),
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
});

export const searchQuerySchema = paginationSchema.extend({
  genres: z.string().optional(),
  term: z.string().max(100, 'Search term must be 100 characters or less').optional(),
  sortBy: z.enum(['title', 'authors', 'published_year', 'average_rating', 'stock'], {
    errorMap: () => ({ message: 'Invalid sort field' })
  }).optional(),
  sort: z.enum(['asc', 'desc'], {
    errorMap: () => ({ message: 'Sort must be either "asc" or "desc"' })
  }).optional(),
});

// Validation helper function
export async function validateRequest<T>(
  event: H3Event,
  schema: z.ZodSchema<T>,
  source: 'body' | 'query' = 'body'
): Promise<T> {
  try {
    const data = source === 'body' 
      ? await readBody(event)
      : getQuery(event);
    
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation Error',
        data: {
          errors: formattedErrors
        }
      });
    }
    
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request data'
    });
  }
}

// Validate route parameters
export function validateRouteParam(value: string, schema: z.ZodSchema): any {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid parameter: ${error.errors[0].message}`
      });
    }
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid parameter'
    });
  }
}