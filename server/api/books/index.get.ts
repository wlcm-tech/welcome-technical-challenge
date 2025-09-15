import { BOOK_PAGE_SIZE } from "~/constants";
import { Book } from "~~/server/models/book.model";
import { validateRequest, searchQuerySchema } from "~/server/utils/validation";

export default defineEventHandler(async (event) => {
  // Validate query parameters
  const validatedQuery = await validateRequest(event, searchQuerySchema, 'query');

  const genreRegex = validatedQuery.genres
    ? validatedQuery.genres.replaceAll(",", "|")
    : "";
  const filterByGenreObject = genreRegex
    ? {
        categories: { $regex: genreRegex, $options: "i" },
      }
    : {};

  const searchObject = validatedQuery.term
    ? { $text: { $search: validatedQuery.term } }
    : {};

  const sortObject = validatedQuery.sortBy
    ? {
        sort: {
          [validatedQuery.sortBy]: validatedQuery.sort || 'asc',
        },
      }
    : {};

  try {
    const books = await Book.find(
      { ...searchObject, ...filterByGenreObject },
      { description: 0, categories: 0, num_pages: 0, ratings_count: 0 }, // exclude fields
      {
        skip: validatedQuery.skip,
        limit: validatedQuery.limit,
        ...sortObject,
      }
    );

    const totalCount = await Book.countDocuments({ ...searchObject, ...filterByGenreObject });

    return { 
      success: true,
      books, 
      total: totalCount,
      skip: validatedQuery.skip,
      limit: validatedQuery.limit
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch books"
    });
  }
});
