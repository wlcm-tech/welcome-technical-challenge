import type { AdminSingleBookReqBody } from "~/types";
import { Book } from "~/server/models/book.model";
import { withErrorHandler, successResponse, ensureResourceExists, tryAsync, ErrorMessages } from "~/server/utils/error-handler";

// Endpoint protected by /server/middleware/admin-only.ts
export default defineEventHandler(withErrorHandler(async (event) => {
  const { book }: AdminSingleBookReqBody = await readBody(event);

  const { _id, ...newVals } = book;

  // Check if book exists
  const existingBook = await tryAsync(
    () => Book.findById(_id),
    ErrorMessages.DATABASE_ERROR
  );
  
  ensureResourceExists(existingBook, 'Book');

  const updatedBook = await tryAsync(
    () => Book.findByIdAndUpdate(_id, newVals, { new: true }),
    'Failed to update book. Please try again.'
  );

  return successResponse(
    updatedBook,
    'Book updated successfully'
  );
}));
