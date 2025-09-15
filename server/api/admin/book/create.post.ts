import { Book } from "~/server/models/book.model";
import { validateRequest, createBooksSchema } from "~/server/utils/validation";

// Endpoint protected by /server/middleware/admin-only.ts
export default defineEventHandler(async (event) => {
  // Validate request body
  const { books } = await validateRequest(event, createBooksSchema);

  // Create all books (not just the first one)
  const createdBooks = await Book.insertMany(books);

  return {
    success: true,
    message: `Successfully created ${createdBooks.length} book(s)`,
    books: createdBooks
  };
});
