import { User } from "~~/server/models/user.model";
import { getServerSession } from "#auth";
import { Book } from "~/server/models/book.model";
import { validateRequest, borrowReturnSchema } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event);
  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required"
    });
  }

  // Validate request body
  const body = await validateRequest(event, borrowReturnSchema);
  const bookIds = body.books.map(({ book }) => book);

  // Check if user actually has these books checked out
  const user = await User.findOne({ email: session.user?.email });
  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: "User not found"
    });
  }

  const checkedOutBookIds = user.checked_out.map(item => item.book.toString());
  const notBorrowed = bookIds.filter(id => !checkedOutBookIds.includes(id));
  
  if (notBorrowed.length > 0) {
    // Get book titles for better error message
    const books = await Book.find({ _id: { $in: notBorrowed } });
    const titles = books.map(book => book.title);
    throw createError({
      statusCode: 400,
      statusMessage: `You don't have the following books checked out: ${titles.join(', ')}`
    });
  }

  // Process the return
  const updatedUser = await User.findOneAndUpdate(
    { email: session.user?.email },
    {
      $push: { history: { $each: body.books } },
      $pull: { checked_out: { book: { $in: bookIds } } },
    },
    { new: true }
  );

  await Book.updateMany(
    { _id: { $in: bookIds } },
    { $inc: { checked_out: -1 } }
  );

  return {
    success: true,
    message: `Successfully returned ${body.books.length} book(s)`,
    user: updatedUser
  };
});
