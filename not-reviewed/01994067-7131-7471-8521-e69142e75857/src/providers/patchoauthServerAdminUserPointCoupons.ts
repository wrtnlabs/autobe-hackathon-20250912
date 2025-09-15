import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPointCoupon";
import { IPageIOauthServerUserPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerUserPointCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a filtered and paginated list of user point coupon usage records.
 *
 * This endpoint allows an admin to query the oauth_server_user_point_coupons
 * table with filters for user_id and point_coupon_id, supporting pagination.
 * Only active records (deleted_at = null) are returned.
 *
 * @param props - Object containing the admin authentication payload and
 *   filtering parameters.
 * @param props.admin - The authenticated admin making the request.
 * @param props.body - The filter and pagination parameters.
 * @returns A paginated list of user point coupon records matching the criteria.
 * @throws {Error} When parameters are invalid or database errors occur.
 */
export async function patchoauthServerAdminUserPointCoupons(props: {
  admin: AdminPayload;
  body: IOauthServerUserPointCoupon.IRequest;
}): Promise<IPageIOauthServerUserPointCoupon> {
  const { admin, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const where: {
    deleted_at: null;
    user_id?: string & tags.Format<"uuid">;
    point_coupon_id?: string & tags.Format<"uuid">;
  } = {
    deleted_at: null,
  };

  if (body.user_id !== undefined && body.user_id !== null) {
    where.user_id = body.user_id;
  }

  if (body.point_coupon_id !== undefined && body.point_coupon_id !== null) {
    where.point_coupon_id = body.point_coupon_id;
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_user_point_coupons.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.oauth_server_user_point_coupons.count({ where }),
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
      user_id: item.user_id,
      point_coupon_id: item.point_coupon_id,
      used_at: toISOStringSafe(item.used_at),
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
