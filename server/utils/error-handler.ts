import type { H3Error } from 'h3';
import mongoose from 'mongoose';

export interface ApiError {
  statusCode: number;
  statusMessage: string;
  data?: any;
}

/**
 * Custom error class for API errors with better structure
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  data?: any;

  constructor(message: string, statusCode: number = 500, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error messages for common scenarios
 */
export const ErrorMessages = {
  // Authentication errors
  UNAUTHORIZED: 'Authentication required. Please log in to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'The requested resource was not found.',
  BOOK_NOT_FOUND: 'The requested book could not be found.',
  USER_NOT_FOUND: 'User profile not found.',
  
  // Validation errors
  INVALID_INPUT: 'The provided input is invalid. Please check your data and try again.',
  MISSING_REQUIRED_FIELDS: 'Required fields are missing.',
  INVALID_ID_FORMAT: 'The provided ID format is invalid.',
  INVALID_ISBN: 'Invalid ISBN format. Please provide a valid 13-digit ISBN.',
  
  // Business logic errors
  BOOK_UNAVAILABLE: 'One or more books are currently unavailable.',
  ALREADY_BORROWED: 'You have already borrowed one or more of these books.',
  NOT_BORROWED: 'You have not borrowed one or more of these books.',
  EXCEEDS_BORROW_LIMIT: 'You have exceeded the maximum number of books you can borrow.',
  
  // Database errors
  DATABASE_ERROR: 'A database error occurred. Please try again later.',
  DUPLICATE_ENTRY: 'This item already exists in the database.',
  CONNECTION_ERROR: 'Unable to connect to the database. Please try again later.',
  
  // Server errors
  INTERNAL_ERROR: 'An internal server error occurred. Please try again later.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',
  
  // Operation errors
  CREATE_FAILED: 'Failed to create the resource. Please try again.',
  UPDATE_FAILED: 'Failed to update the resource. Please try again.',
  DELETE_FAILED: 'Failed to delete the resource. Please try again.',
  OPERATION_FAILED: 'The operation could not be completed. Please try again.',
};

/**
 * Handles different types of errors and returns appropriate error response
 */
export function handleError(error: any): H3Error {
  // Handle custom AppError
  if (error instanceof AppError) {
    return createError({
      statusCode: error.statusCode,
      statusMessage: error.message,
      data: error.data
    });
  }

  // Handle H3Error (already formatted)
  if (error.statusCode && error.statusMessage) {
    return error;
  }

  // Handle Mongoose validation errors
  if (error.name === 'ValidationError' && error.errors) {
    const validationErrors = Object.keys(error.errors).map(field => ({
      field,
      message: error.errors[field].message
    }));
    
    return createError({
      statusCode: 400,
      statusMessage: ErrorMessages.INVALID_INPUT,
      data: { errors: validationErrors }
    });
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (error.name === 'CastError' && error.kind === 'ObjectId') {
    return createError({
      statusCode: 400,
      statusMessage: ErrorMessages.INVALID_ID_FORMAT,
      data: { field: error.path, value: error.value }
    });
  }

  // Handle MongoDB duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return createError({
      statusCode: 409,
      statusMessage: `A record with this ${field} already exists.`,
      data: { field, value: error.keyValue[field] }
    });
  }

  // Handle MongoDB connection errors
  if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
    return createError({
      statusCode: 503,
      statusMessage: ErrorMessages.CONNECTION_ERROR
    });
  }

  // Default error
  console.error('Unhandled error:', error);
  return createError({
    statusCode: 500,
    statusMessage: ErrorMessages.INTERNAL_ERROR
  });
}

/**
 * Wraps an async handler with error handling
 */
export function withErrorHandler<T = any>(
  handler: (event: any) => Promise<T>
): (event: any) => Promise<T> {
  return async (event: any) => {
    try {
      return await handler(event);
    } catch (error) {
      throw handleError(error);
    }
  };
}

/**
 * Creates a success response with consistent structure
 */
export function successResponse<T = any>(
  data: T,
  message: string = 'Operation completed successfully',
  statusCode: number = 200
) {
  return {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Validates that a resource exists, throws error if not
 */
export function ensureResourceExists<T>(
  resource: T | null | undefined,
  resourceName: string = 'Resource'
): asserts resource is T {
  if (!resource) {
    throw new AppError(
      `${resourceName} not found`,
      404,
      { resource: resourceName }
    );
  }
}

/**
 * Handles async operations with proper error handling
 */
export async function tryAsync<T>(
  operation: () => Promise<T>,
  errorMessage: string = ErrorMessages.OPERATION_FAILED
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error('Async operation failed:', error);
    throw new AppError(errorMessage, 500);
  }
}