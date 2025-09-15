import { User } from "~~/server/models/user.model";
import { getServerSession } from "#auth";
import { BookReqBody } from "~/types";
import { Book } from "~/server/models/book.model";
import { withErrorHandler, successResponse, tryAsync, ErrorMessages, AppError } from "~/server/utils/error-handler";

export default defineEventHandler(withErrorHandler(async (event) => {
  const session = await getServerSession(event);
  if (!session) {
    throw new AppError(ErrorMessages.UNAUTHORIZED, 401);
  }

  const body: BookReqBody = await readBody(event);

  if (!body.books || body.books.length === 0) {
    throw new AppError('No books selected for borrowing', 400);
  }

  const bookIds = body.books.map(({ book }) => book);
  
  // Check if all books exist and are available
  const books = await tryAsync(
    () => Book.find({ _id: { $in: bookIds } }),
    ErrorMessages.DATABASE_ERROR
  );
  
  if (books.length !== bookIds.length) {
    const foundIds = books.map(book => book._id.toString());
    const missingIds = bookIds.filter(id => !foundIds.includes(id));
    throw new AppError(
      ErrorMessages.BOOK_NOT_FOUND,
      404,
      { missingIds }
    );
  }

  // Check availability
  const unavailableBooks = books.filter(book => 
    (book.stock - book.checked_out) <= 0
  );
  
  if (unavailableBooks.length > 0) {
    throw new AppError(
      ErrorMessages.BOOK_UNAVAILABLE,
      400,
      { 
        unavailable: unavailableBooks.map(b => ({
          title: b.title,
          isbn: b.isbn13
        }))
      }
    );
  }

  // Check if user already has any of these books
  const existingUser = await User.findOne({ email: session.user?.email });
  if (existingUser) {
    const currentlyBorrowed = existingUser.checked_out.map(item => item.book.toString());
    const alreadyBorrowed = bookIds.filter(id => currentlyBorrowed.includes(id));
    
    if (alreadyBorrowed.length > 0) {
      const alreadyBorrowedBooks = books.filter(book => 
        alreadyBorrowed.includes(book._id.toString())
      );
      throw new AppError(
        ErrorMessages.ALREADY_BORROWED,
        400,
        { 
          books: alreadyBorrowedBooks.map(b => ({
            title: b.title,
            isbn: b.isbn13
          }))
        }
      );
    }
  }

  // Process the borrowing
  const user = await tryAsync(
    () => User.findOneAndUpdate(
      { email: session.user?.email },
      { $push: { checked_out: { $each: body.books } } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ),
    'Failed to update user records'
  );

  await tryAsync(
    () => Book.updateMany(
      { _id: { $in: bookIds } },
      { $inc: { checked_out: 1 } }
    ),
    'Failed to update book availability'
  );

  return successResponse(
    { user, borrowedBooks: books },
    `Successfully borrowed ${body.books.length} book(s)`
  );
}));
