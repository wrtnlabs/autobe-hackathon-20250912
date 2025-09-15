import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ILibraryManagementBooks } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementBooks";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

/**
 * Updates an existing book record by its bookId
 *
 * This operation is restricted to guestUser role and validates all update
 * fields. It ensures the book exists and is not soft deleted and that the ISBN
 * remains unique.
 *
 * @param props - Object containing guestUser payload, book UUID, and update
 *   body
 * @returns The updated book record conforming to ILibraryManagementBooks
 * @throws {Error} When validation fails (missing or invalid title, author,
 *   isbn)
 * @throws {Error} When the book is not found or is soft deleted
 * @throws {Error} When the ISBN conflicts with another existing book
 */
export async function putlibraryManagementGuestUserBooksBookId(props: {
  guestUser: GuestuserPayload;
  bookId: string & tags.Format<"uuid">;
  body: ILibraryManagementBooks.IUpdate;
}): Promise<ILibraryManagementBooks> {
  const { guestUser, bookId, body } = props;

  // Authorization: guestUser role assumed validated prior

  // Validate required fields with trimming
  if (!body.title || body.title.trim() === "") {
    throw new Error(
      "Validation Error: 'title' is required and cannot be empty",
    );
  }

  if (!body.author || body.author.trim() === "") {
    throw new Error(
      "Validation Error: 'author' is required and cannot be empty",
    );
  }

  if (!body.isbn || body.isbn.trim() === "") {
    throw new Error("Validation Error: 'isbn' is required and cannot be empty");
  }

  const title = body.title.trim();
  const author = body.author.trim();
  const isbn = body.isbn.trim();

  // Validate ISBN format (ISBN-10 or ISBN-13)
  const isbn10Regex = /^(?:\d{9}X|\d{10})$/;
  const isbn13Regex = /^(?:\d{13})$/;

  if (!(isbn10Regex.test(isbn) || isbn13Regex.test(isbn))) {
    throw new Error(
      "Validation Error: 'isbn' must be a valid ISBN-10 or ISBN-13 format",
    );
  }

  // Check book existence and soft delete status
  const existingBook = await MyGlobal.prisma.library_management_books.findFirst(
    {
      where: { id: bookId, deleted_at: null },
    },
  );
  if (!existingBook) {
    throw new Error("Not Found: Book does not exist");
  }

  // Check ISBN uniqueness excluding current book
  const isbnConflict = await MyGlobal.prisma.library_management_books.findFirst(
    {
      where: { isbn, deleted_at: null, NOT: { id: bookId } },
    },
  );
  if (isbnConflict) {
    throw new Error("Conflict: ISBN already exists for another book");
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.library_management_books.update({
    where: { id: bookId },
    data: { title, author, isbn, updated_at: now },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    title: updated.title,
    author: updated.author,
    isbn: updated.isbn,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
