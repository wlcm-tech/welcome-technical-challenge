import { BOOK_PAGE_SIZE } from "~/constants";
import { Book } from "~~/server/models/book.model";
import { withErrorHandler, successResponse, tryAsync, ErrorMessages } from "~/server/utils/error-handler";

export default defineEventHandler(withErrorHandler(async (event) => {
  const query = getQuery(event);

  // Parse and validate query parameters
  const skip = Math.max(0, parseInt(query.skip as string) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || BOOK_PAGE_SIZE));

  const genreRegex = query.genres
    ? (query.genres as string).replaceAll(",", "|")
    : "";
  const filterByGenreObject = genreRegex
    ? {
        categories: { $regex: genreRegex, $options: "i" },
      }
    : {};

  const searchObject = query.term
    ? { $text: { $search: query.term as string } }
    : {};

  const sortObject = query.sortBy
    ? {
        sort: {
          [query.sortBy as string]: query.sort || 'asc',
        },
      }
    : {};

  const [books, totalCount] = await Promise.all([
    tryAsync(
      () => Book.find(
        { ...searchObject, ...filterByGenreObject },
        { description: 0, categories: 0, num_pages: 0, ratings_count: 0 }, // exclude fields
        {
          skip,
          limit,
          ...sortObject,
        }
      ),
      'Failed to fetch books. Please try again.'
    ),
    tryAsync(
      () => Book.countDocuments({ ...searchObject, ...filterByGenreObject }),
      'Failed to count books.'
    )
  ]);

  return successResponse(
    {
      books,
      pagination: {
        total: totalCount,
        skip,
        limit,
        hasMore: skip + limit < totalCount
      }
    },
    'Books fetched successfully'
  );
}));
