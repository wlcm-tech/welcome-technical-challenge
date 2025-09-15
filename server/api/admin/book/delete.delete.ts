import { Book } from "~/server/models/book.model";
import { User } from "~/server/models/user.model";
import { validateRequest, deleteBookIdsSchema } from "~/server/utils/validation";

// Endpoint protected by /server/middleware/admin-only.ts
export default defineEventHandler(async (event) => {
  // Validate request body
  const { ids } = await validateRequest(event, deleteBookIdsSchema);

  // Check if all books exist
  const existingBooks = await Book.find({ _id: { $in: ids } });
  if (existingBooks.length !== ids.length) {
    const foundIds = existingBooks.map(book => book._id.toString());
    const missingIds = ids.filter(id => !foundIds.includes(id));
    throw createError({
      statusCode: 404,
      statusMessage: `Books not found: ${missingIds.join(', ')}`
    });
  }

  const deleteResult = await Book.deleteMany({ _id: { $in: ids } });

  // Here I am just removing any record of the book for every user, in a real project
  // I would handle it another way as the user stil posesses a physical copy
  await User.updateMany(
    { "checked_out.book": { $in: ids }, "history.book": { $in: ids } },
    {
      $pull: {
        checked_out: { book: { $in: ids } },
        history: { book: { $in: ids } },
      },
    }
  );

  return {
    success: true,
    message: `Successfully deleted ${deleteResult.deletedCount} book(s)`,
    deletedCount: deleteResult.deletedCount
  };
});
