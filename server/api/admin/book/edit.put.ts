import { Book } from "~/server/models/book.model";
import { validateRequest, editBookSchema } from "~/server/utils/validation";

// Endpoint protected by /server/middleware/admin-only.ts
export default defineEventHandler(async (event) => {
  // Validate request body
  const { book } = await validateRequest(event, editBookSchema);

  const { _id, ...newVals } = book;

  // Check if book exists
  const existingBook = await Book.findById(_id);
  if (!existingBook) {
    throw createError({
      statusCode: 404,
      statusMessage: `Book with ID ${_id} not found`
    });
  }

  const updatedBook = await Book.findByIdAndUpdate(_id, newVals, { new: true });

  return {
    success: true,
    message: 'Book updated successfully',
    book: updatedBook
  };
});
