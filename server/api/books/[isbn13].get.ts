import { Book } from "~~/server/models/book.model";
import { validateRouteParam, isbn13Schema } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const isbn13 = getRouterParam(event, "isbn13");
  
  // Validate ISBN13 format
  const validatedIsbn = validateRouteParam(isbn13 || '', isbn13Schema);

  const bookDetails = await Book.findOne({ isbn13: validatedIsbn });

  if (!bookDetails) {
    throw createError({
      statusCode: 404,
      statusMessage: `Book with ISBN13 ${validatedIsbn} not found`
    });
  }

  return {
    success: true,
    book: bookDetails
  };
});
