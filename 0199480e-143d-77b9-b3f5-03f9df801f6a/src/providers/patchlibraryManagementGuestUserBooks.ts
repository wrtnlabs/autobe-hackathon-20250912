import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ILibraryManagementBooks } from "@ORGANIZATION/PROJECT-api/lib/structures/ILibraryManagementBooks";
import { IPageILibraryManagementBooks } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageILibraryManagementBooks";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

/**
 * Retrieve a paginated list of books in the library collection.
 *
 * Supports partial title searches using PostgreSQL trigram index. Only
 * non-deleted books (deleted_at is null) are included.
 *
 * Pagination and sorting parameters can be provided.
 *
 * @param props - Object containing guest user info and request body.
 * @param props.guestUser - The authenticated guest user payload.
 * @param props.body - Search and pagination parameters for books list
 *   retrieval.
 * @returns Paginated list of book summaries matching search criteria.
 * @throws {Error} Throws if Prisma query fails or pagination parameters are
 *   invalid.
 */
export async function patchlibraryManagementGuestUserBooks(props: {
  guestUser: GuestuserPayload;
  body: ILibraryManagementBooks.IRequest;
}): Promise<IPageILibraryManagementBooks.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && {
        title: { contains: body.search },
      }),
  };

  const orderByField = body.orderBy ?? "created_at";
  const orderDirection = body.orderDirection ?? "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.library_management_books.findMany({
      where: whereCondition,
      select: { id: true, title: true, author: true, isbn: true },
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.library_management_books.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      title: item.title,
      author: item.author,
      isbn: item.isbn,
    })),
  };
}
