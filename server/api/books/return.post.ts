import { User } from "~~/server/models/user.model";
import { getServerSession } from "#auth";
import { BookReqBody } from "~/types";
import { Book } from "~/server/models/book.model";
import { withErrorHandler, successResponse, tryAsync, ErrorMessages, AppError, ensureResourceExists } from "~/server/utils/error-handler";

export default defineEventHandler(withErrorHandler(async (event) => {
  const session = await getServerSession(event);
  if (!session) {
    throw new AppError(ErrorMessages.UNAUTHORIZED, 401);
  }

  const body: BookReqBody = await readBody(event);
  
  if (!body.books || body.books.length === 0) {
    throw new AppError('No books selected for return', 400);
  }
  
  const bookIds = body.books.map(({ book }) => book);

  // Check if user exists and has these books
  const user = await tryAsync(
    () => User.findOne({ email: session.user?.email }),
    ErrorMessages.DATABASE_ERROR
  );
  
  ensureResourceExists(user, 'User profile');

  const checkedOutBookIds = user.checked_out.map(item => item.book.toString());
  const notBorrowed = bookIds.filter(id => !checkedOutBookIds.includes(id));
  
  if (notBorrowed.length > 0) {
    // Get book details for better error message
    const books = await Book.find({ _id: { $in: notBorrowed } });
    throw new AppError(
      ErrorMessages.NOT_BORROWED,
      400,
      { 
        books: books.map(book => ({
          title: book.title,
          isbn: book.isbn13
        }))
      }
    );
  }

  // Process the return
  const updatedUser = await tryAsync(
    () => User.findOneAndUpdate(
      { email: session.user?.email },
      {
        $push: { history: { $each: body.books } },
        $pull: { checked_out: { book: { $in: bookIds } } },
      },
      { new: true }
    ),
    'Failed to update user records'
  );

  await tryAsync(
    () => Book.updateMany(
      { _id: { $in: bookIds } },
      { $inc: { checked_out: -1 } }
    ),
    'Failed to update book availability'
  );

  // Get returned book details
  const returnedBooks = await Book.find({ _id: { $in: bookIds } });

  return successResponse(
    { user: updatedUser, returnedBooks },
    `Successfully returned ${body.books.length} book(s)`
  );
}));
