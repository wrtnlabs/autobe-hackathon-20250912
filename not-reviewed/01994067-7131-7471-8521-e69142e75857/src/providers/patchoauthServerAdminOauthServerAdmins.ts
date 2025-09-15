import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerOauthServerAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerAdmins";
import { IPageIOauthServerOauthServerAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerOauthServerAdmins";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Searches and retrieves a paginated and filtered list of OAuth server
 * administrator users.
 *
 * This endpoint supports filtering by email and email verification status with
 * pagination and sorting. It excludes soft-deleted records by filtering for
 * null 'deleted_at'.
 *
 * Authorization is enforced to allow only authenticated admins.
 *
 * @param props - The request properties including authenticated admin and
 *   search filters.
 * @param props.admin - The authenticated admin performing the request.
 * @param props.body - Search criteria including email, email_verified,
 *   pagination, and sort order.
 * @returns A paginated summary list of OAuth server admins matching the
 *   provided filters.
 * @throws {Error} If database access or operation fails.
 */
export async function patchoauthServerAdminOauthServerAdmins(props: {
  admin: AdminPayload;
  body: IOauthServerOauthServerAdmins.IRequest;
}): Promise<IPageIOauthServerOauthServerAdmins.ISummary> {
  const { admin, body } = props;

  const page = body.page == null ? 1 : body.page;
  const limit = body.limit == null ? 10 : body.limit;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null as null,
    ...(body.email !== undefined ? { email: { contains: body.email } } : {}),
    ...(body.email_verified !== undefined
      ? { email_verified: body.email_verified }
      : {}),
  };

  const orderBy =
    body.sort === "asc"
      ? { email: "asc" }
      : body.sort === "desc"
        ? { email: "desc" }
        : { created_at: "desc" };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_admins.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.oauth_server_admins.count({ where }),
  ]);

  const data = results.map((r) => ({
    id: r.id,
    email: r.email,
    email_verified: r.email_verified,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
