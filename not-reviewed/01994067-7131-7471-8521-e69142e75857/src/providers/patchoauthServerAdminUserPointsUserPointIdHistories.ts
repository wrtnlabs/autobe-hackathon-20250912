import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserPointHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPointHistory";
import { IPageIOauthServerUserPointHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerUserPointHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated list of user point transaction histories for a specific
 * user point.
 *
 * This operation supports filtering by reason, change amount, created and
 * updated date ranges, and the ability to filter active records only
 * (deleted_at is null). It also supports pagination and sorting with validation
 * on sort fields.
 *
 * @param props - Object containing admin payload, userPointId path param, and
 *   filter/pagination body
 * @param props.admin - The admin user authorized to perform this operation
 * @param props.userPointId - UUID of the user point record to filter histories
 * @param props.body - Filtering, pagination, and sorting parameters
 * @returns Paginated summary list of user point history records
 * @throws {Error} If the database query fails
 */
export async function patchoauthServerAdminUserPointsUserPointIdHistories(props: {
  admin: AdminPayload;
  userPointId: string & tags.Format<"uuid">;
  body: IOauthServerUserPointHistory.IRequest;
}): Promise<IPageIOauthServerUserPointHistory.ISummary> {
  const { admin, userPointId, body } = props;
  const page =
    body.page ?? (1 as number & tags.Type<"int32"> & tags.Minimum<0>);
  const limit =
    body.limit ?? (10 as number & tags.Type<"int32"> & tags.Minimum<0>);
  const skip = (page - 1) * limit;

  const where: {
    user_point_id: string & tags.Format<"uuid">;
    reason?: { contains: string };
    change_amount?: number & tags.Type<"int32">;
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    updated_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    deleted_at?: null;
  } = {
    user_point_id: userPointId,
    ...(body.reason !== undefined &&
      body.reason !== null && { reason: { contains: body.reason } }),
    ...(body.change_amount !== undefined &&
      body.change_amount !== null && { change_amount: body.change_amount }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
            body.created_at_from !== null
              ? { gte: body.created_at_from }
              : {}),
            ...(body.created_at_to !== undefined && body.created_at_to !== null
              ? { lte: body.created_at_to }
              : {}),
          },
        }
      : {}),
    ...((body.updated_at_from !== undefined && body.updated_at_from !== null) ||
    (body.updated_at_to !== undefined && body.updated_at_to !== null)
      ? {
          updated_at: {
            ...(body.updated_at_from !== undefined &&
            body.updated_at_from !== null
              ? { gte: body.updated_at_from }
              : {}),
            ...(body.updated_at_to !== undefined && body.updated_at_to !== null
              ? { lte: body.updated_at_to }
              : {}),
          },
        }
      : {}),
    ...(body.deleted_at_null !== undefined &&
    body.deleted_at_null !== null &&
    body.deleted_at_null === true
      ? { deleted_at: null }
      : {}),
  };

  const validSortKeys = new Set([
    "id",
    "change_amount",
    "balance_after_change",
    "reason",
    "created_at",
  ]);
  const orderBy:
    | { [P in keyof typeof where]?: "asc" | "desc" }
    | { created_at: "asc" | "desc" } =
    body.sort && validSortKeys.has(body.sort.key)
      ? { [body.sort.key]: body.sort.direction === "asc" ? "asc" : "desc" }
      : { created_at: "desc" };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_user_point_histories.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        change_amount: true,
        balance_after_change: true,
        reason: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.oauth_server_user_point_histories.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: results.map((item) => ({
      id: item.id,
      change_amount: item.change_amount,
      balance_after_change: item.balance_after_change,
      reason: item.reason,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
