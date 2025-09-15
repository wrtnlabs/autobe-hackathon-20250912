import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

/**
 * Delete a book by its ID
 *
 * This operation permanently deletes a book from the library's collection by
 * its unique identifier. The book ID must be provided as a path parameter.
 * Access is granted exclusively to the guestUser role. Upon successful
 * deletion, the operation returns no content. Errors include 404 if the
 * specified book does not exist. This operation performs a hard delete without
 * soft delete behavior. It manipulates the library_management_books table which
 * stores book information including title, author, and ISBN.
 *
 * @param props - Object containing:
 *
 *   - GuestUser: Authenticated guest user payload.
 *   - BookId: UUID of the book to delete.
 *
 * @returns Void
 * @throws {Error} If the book with given ID does not exist (404).
 */
export async function deletelibraryManagementGuestUserBooksBookId(props: {
  guestUser: GuestuserPayload;
  bookId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { bookId } = props;

  await MyGlobal.prisma.library_management_books.findUniqueOrThrow({
    where: { id: bookId },
  });

  await MyGlobal.prisma.library_management_books.delete({
    where: { id: bookId },
  });
}
