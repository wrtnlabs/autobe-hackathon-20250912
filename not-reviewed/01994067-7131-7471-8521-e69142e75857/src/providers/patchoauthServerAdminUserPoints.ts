import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPoint";
import { IPageIOauthServerUserPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerUserPoint";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated list of user point balances.
 *
 * This operation is restricted to authenticated admin users. It supports
 * pagination, filtering by user ID and balance range, and excludes soft-deleted
 * records.
 *
 * @param props - Request properties containing authenticated admin and filters
 * @param props.admin - Authenticated admin user
 * @param props.body - Filtering and pagination criteria
 * @returns Paginated list of user point records
 * @throws {Error} If page or limit parameters are invalid
 * @throws {Error} If balance_min is greater than balance_max
 */
export async function patchoauthServerAdminUserPoints(props: {
  admin: AdminPayload;
  body: IOauthServerUserPoint.IRequest;
}): Promise<IPageIOauthServerUserPoint> {
  const { admin, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  if (page <= 0) throw new Error("Page must be a positive integer");
  if (limit <= 0) throw new Error("Limit must be a positive integer");

  if (
    body.balance_min !== undefined &&
    body.balance_min !== null &&
    body.balance_max !== undefined &&
    body.balance_max !== null &&
    body.balance_min > body.balance_max
  ) {
    throw new Error("balance_min cannot be greater than balance_max");
  }

  const where = {
    deleted_at: null,
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.balance_min !== undefined &&
    body.balance_min !== null &&
    body.balance_max !== undefined &&
    body.balance_max !== null
      ? {
          balance: {
            gte: body.balance_min,
            lte: body.balance_max,
          },
        }
      : body.balance_min !== undefined && body.balance_min !== null
        ? { balance: { gte: body.balance_min } }
        : body.balance_max !== undefined && body.balance_max !== null
          ? { balance: { lte: body.balance_max } }
          : {}),
  };

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_user_points.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.oauth_server_user_points.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      user_id: item.user_id as string & tags.Format<"uuid">,
      balance: item.balance as number & tags.Type<"int32">,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
