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
      { history: 0 }
    ).populate("checked_out.book"),
    ErrorMessages.DATABASE_ERROR
  );

  if (!user) {
    // Create user if doesn't exist
    return successResponse(
      { checked_out: [] },
      'No borrowed books found'
    );
  }

  return successResponse(
    user,
    'Borrowed books fetched successfully'
  );
}));
