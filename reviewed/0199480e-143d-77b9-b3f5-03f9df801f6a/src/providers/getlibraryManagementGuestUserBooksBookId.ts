import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ILibraryManagementBooks } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementBooks";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

/**
 * Retrieve detailed information about a single book by its unique identifier.
 *
 * This endpoint fetches a book record from library_management_books excluding
 * soft deleted entries. It returns book details such as title, author, ISBN,
 * and timestamps.
 *
 * Access is permitted for guest users.
 *
 * @param props - Object containing the guestUser authentication payload and the
 *   bookId UUID.
 * @param props.guestUser - The authenticated guest user.
 * @param props.bookId - The UUID of the book to retrieve.
 * @returns Detailed book information conforming to ILibraryManagementBooks.
 * @throws {Error} Throws an error if the book does not exist or has been soft
 *   deleted.
 */
export async function getlibraryManagementGuestUserBooksBookId(props: {
  guestUser: GuestuserPayload;
  bookId: string & tags.Format<"uuid">;
}): Promise<ILibraryManagementBooks> {
  const { bookId } = props;

  const book = await MyGlobal.prisma.library_management_books.findFirstOrThrow({
    where: {
      id: bookId,
      deleted_at: null,
    },
  });

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    created_at: toISOStringSafe(book.created_at),
    updated_at: toISOStringSafe(book.updated_at),
    deleted_at: book.deleted_at ? toISOStringSafe(book.deleted_at) : null,
  };
}
