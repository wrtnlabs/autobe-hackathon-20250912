import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerScope";
import { IPageIOauthServerScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerScope";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated, filtered list of OAuth scopes.
 *
 * Supports searching by code or description, sorting by specified fields, and
 * pagination with page and limit parameters. Only non-deleted scopes
 * (deleted_at is null) are included.
 *
 * Access is restricted to admins.
 *
 * @param props - Object containing admin authentication payload and request
 *   body
 * @param props.admin - Authenticated admin payload
 * @param props.body - Filter, pagination, and sorting parameters
 * @returns Paginated list of OAuth scope summaries with pagination info
 * @throws {Error} Throws error if database queries fail
 */
export async function patchoauthServerAdminScopes(props: {
  admin: AdminPayload;
  body: IOauthServerScope.IRequest;
}): Promise<IPageIOauthServerScope.ISummary> {
  const { admin, body } = props;

  const page = body.page ?? 0;
  const limit = body.limit ?? 20;

  const where: {
    deleted_at: null;
    OR?:
      | { code: { contains: string } }
      | { description: { contains: string } }[];
  } = { deleted_at: null };

  if (body.search !== null && body.search !== undefined) {
    where.OR = [
      { code: { contains: body.search } },
      { description: { contains: body.search } },
    ];
  }

  const sortBy =
    body.sortBy === null || body.sortBy === undefined
      ? "created_at"
      : body.sortBy;

  const sortDirection =
    body.sortDirection === null || body.sortDirection === undefined
      ? "desc"
      : body.sortDirection;

  const [records, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_scopes.findMany({
      where: where as any,
      orderBy: { [sortBy]: sortDirection },
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        code: true,
        description: true,
      },
    }),
    MyGlobal.prisma.oauth_server_scopes.count({ where: where }),
  ]);

  return {
    pagination: {
      current: Number(page) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: Number(total) as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: records,
  };
}
