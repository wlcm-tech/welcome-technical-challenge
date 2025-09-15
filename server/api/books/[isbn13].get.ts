import { Book } from "~~/server/models/book.model";
import { withErrorHandler, successResponse, ensureResourceExists, tryAsync, ErrorMessages, AppError } from "~/server/utils/error-handler";

export default defineEventHandler(withErrorHandler(async (event) => {
  const isbn13 = getRouterParam(event, "isbn13");

  if (!isbn13) {
    throw new AppError('ISBN13 parameter is required', 400);
  }

  // Validate ISBN13 format
  if (!/^\d{13}$/.test(isbn13)) {
    throw new AppError(
      ErrorMessages.INVALID_ISBN,
      400,
      { isbn: isbn13 }
    );
  }

  const bookDetails = await tryAsync(
    () => Book.findOne({ isbn13 }),
    ErrorMessages.DATABASE_ERROR
  );

  ensureResourceExists(bookDetails, `Book with ISBN ${isbn13}`);

  return successResponse(
    bookDetails,
    'Book details fetched successfully'
  );
}));
