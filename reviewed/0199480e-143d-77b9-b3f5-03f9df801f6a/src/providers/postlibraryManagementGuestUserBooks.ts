import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ILibraryManagementBooks } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementBooks";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

/**
 * Add a new book to the library collection by providing title, author, and
 * ISBN.
 *
 * This operation allows a guest user to create a new book record with a unique
 * ISBN. The function generates a UUID for the book, sets creation and update
 * timestamps, and returns the complete book record including soft-delete
 * timestamp if present.
 *
 * @param props - Object containing the guestUser payload and create body
 * @param props.guestUser - The guest user payload (not used for authorization)
 * @param props.body - Book creation data including title, author, and ISBN
 * @returns The newly created book record with all fields
 * @throws {Error} If Prisma create operation fails (e.g., duplicate ISBN)
 */
export async function postlibraryManagementGuestUserBooks(props: {
  guestUser: GuestuserPayload;
  body: ILibraryManagementBooks.ICreate;
}): Promise<ILibraryManagementBooks> {
  const { body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.library_management_books.create({
    data: {
      id: id,
      title: body.title,
      author: body.author,
      isbn: body.isbn,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    title: created.title,
    author: created.author,
    isbn: created.isbn,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
