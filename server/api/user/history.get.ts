import { User } from "~~/server/models/user.model";
import { getServerSession } from "#auth";
import { withErrorHandler, successResponse, tryAsync, ErrorMessages, AppError } from "~/server/utils/error-handler";

export default defineEventHandler(withErrorHandler(async (event) => {
  const session = await getServerSession(event);
  if (!session) {
    throw new AppError(ErrorMessages.UNAUTHORIZED, 401);
  }

  const user = await tryAsync(
    () => User.findOne(
      { email: session.user?.email },
      { checked_out: 0 }
    ).populate("history.book"),
    ErrorMessages.DATABASE_ERROR
  );

  if (!user) {
    // Create user if doesn't exist
    return successResponse(
      { history: [] },
      'No borrowing history found'
    );
  }

  return successResponse(
    user,
    'Borrowing history fetched successfully'
  );
}));
