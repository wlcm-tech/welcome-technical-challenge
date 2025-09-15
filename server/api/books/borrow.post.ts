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
  
  // Check if all books exist and are available
  const books = await Book.find({ _id: { $in: bookIds } });
  
  if (books.length !== bookIds.length) {
    const foundIds = books.map(book => book._id.toString());
    const missingIds = bookIds.filter(id => !foundIds.includes(id));
    throw createError({
      statusCode: 404,
      statusMessage: `Books not found: ${missingIds.join(', ')}`
    });
  }

  // Check availability
  const unavailableBooks = books.filter(book => 
    (book.stock - book.checked_out) <= 0
  );
  
  if (unavailableBooks.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `The following books are not available: ${unavailableBooks.map(b => b.title).join(', ')}`
    });
  }

  // Check if user already has any of these books checked out
  const user = await User.findOne({ email: session.user?.email });
  if (user) {
    const currentlyBorrowed = user.checked_out.map(item => item.book.toString());
    const alreadyBorrowed = bookIds.filter(id => currentlyBorrowed.includes(id));
    
    if (alreadyBorrowed.length > 0) {
      const alreadyBorrowedTitles = books
        .filter(book => alreadyBorrowed.includes(book._id.toString()))
        .map(book => book.title);
      throw createError({
        statusCode: 400,
        statusMessage: `You already have the following books: ${alreadyBorrowedTitles.join(', ')}`
      });
    }
  }

  // Process the borrowing
  const updatedUser = await User.findOneAndUpdate(
    { email: session.user?.email },
    { $push: { checked_out: { $each: body.books } } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Book.updateMany(
    { _id: { $in: bookIds } },
    { $inc: { checked_out: 1 } }
  );

  return {
    success: true,
    message: `Successfully borrowed ${body.books.length} book(s)`,
    user: updatedUser
  };
});
