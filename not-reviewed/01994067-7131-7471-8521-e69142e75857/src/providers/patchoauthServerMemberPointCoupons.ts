import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerPointCoupon";
import { IPageIOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerPointCoupon";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieves a paginated and filtered list of active point coupons available in
 * the system.
 *
 * Supports search by partial coupon code, filtering by expiration date ranges,
 * and sorting by selected fields. Only non-deleted (active) coupons are
 * listed.
 *
 * @param props - Input properties including the authenticated member and
 *   request filters
 * @param props.member - Authenticated member payload (authorization enforced
 *   externally)
 * @param props.body - Filtering, pagination, and sorting options
 * @returns Paginated list of point coupons matching the provided filters
 * @throws {Error} When database query fails
 */
export async function patchoauthServerMemberPointCoupons(props: {
  member: MemberPayload;
  body: IOauthServerPointCoupon.IRequest;
}): Promise<IPageIOauthServerPointCoupon> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: {
    deleted_at: null;
    code?: {
      contains: string;
    };
    expire_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = { deleted_at: null };

  if (body.code !== undefined) {
    where.code = { contains: body.code };
  }

  if (body.expire_at_from !== undefined && body.expire_at_from !== null) {
    where.expire_at = {
      ...where.expire_at,
      gte: body.expire_at_from,
    };
  }

  if (body.expire_at_to !== undefined && body.expire_at_to !== null) {
    where.expire_at = {
      ...where.expire_at,
      lte: body.expire_at_to,
    };
  }

  // Allowed sorting fields whitelist
  const allowedOrderBy = new Set([
    "code",
    "expire_at",
    "created_at",
    "updated_at",
  ]);
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };

  if (
    body.order_by !== undefined &&
    body.order_by !== null &&
    allowedOrderBy.has(body.order_by) &&
    (body.order_direction === "asc" || body.order_direction === "desc")
  ) {
    orderBy = { [body.order_by]: body.order_direction };
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_point_coupons.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.oauth_server_point_coupons.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      code: item.code,
      description: item.description ?? null,
      value: item.value,
      max_issuance: item.max_issuance,
      expire_at: toISOStringSafe(item.expire_at),
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
