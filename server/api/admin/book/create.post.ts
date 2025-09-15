import type { AdminMultiBookReqBody } from "~/types";
import { Book } from "~/server/models/book.model";
import { withErrorHandler, successResponse, tryAsync, ErrorMessages, AppError } from "~/server/utils/error-handler";

// Endpoint protected by /server/middleware/admin-only.ts
export default defineEventHandler(withErrorHandler(async (event) => {
  const { books }: AdminMultiBookReqBody = await readBody(event);

  if (!books || books.length === 0) {
    throw new AppError(ErrorMessages.MISSING_REQUIRED_FIELDS, 400, {
      field: 'books',
      message: 'At least one book is required'
    });
  }

  const createdBooks = await tryAsync(
    () => Book.insertMany(books),
    'Failed to create books. Please check your data and try again.'
  );

  return successResponse(
    createdBooks,
    `Successfully created ${createdBooks.length} book(s)`,
    201
  );
}));
