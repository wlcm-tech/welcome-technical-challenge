import { Book } from "~/server/models/book.model";
import { User } from "~/server/models/user.model";
import { withErrorHandler, successResponse, tryAsync, ErrorMessages, AppError } from "~/server/utils/error-handler";

// Endpoint protected by /server/middleware/admin-only.ts
export default defineEventHandler(withErrorHandler(async (event) => {
  const { ids }: { ids: string[] } = await readBody(event);

  if (!ids || ids.length === 0) {
    throw new AppError(ErrorMessages.MISSING_REQUIRED_FIELDS, 400, {
      field: 'ids',
      message: 'At least one book ID is required'
    });
  }

  // Verify all books exist before deletion
  const existingBooks = await tryAsync(
    () => Book.find({ _id: { $in: ids } }),
    ErrorMessages.DATABASE_ERROR
  );

  if (existingBooks.length !== ids.length) {
    const foundIds = existingBooks.map(book => book._id.toString());
    const missingIds = ids.filter(id => !foundIds.includes(id));
    throw new AppError(
      `Cannot delete: Some books were not found`,
      404,
      { missingIds }
    );
  }

  const deleteResult = await tryAsync(
    () => Book.deleteMany({ _id: { $in: ids } }),
    ErrorMessages.DELETE_FAILED
  );

  // Here I am just removing any record of the book for every user, in a real project
  // I would handle it another way as the user stil posesses a physical copy
  await tryAsync(
    () => User.updateMany(
      { "checked_out.book": { $in: ids }, "history.book": { $in: ids } },
      {
        $pull: {
          checked_out: { book: { $in: ids } },
          history: { book: { $in: ids } },
        },
      }
    ),
    'Failed to update user records'
  );

  return successResponse(
    { deletedCount: deleteResult.deletedCount },
    `Successfully deleted ${deleteResult.deletedCount} book(s)`
  );
}));
