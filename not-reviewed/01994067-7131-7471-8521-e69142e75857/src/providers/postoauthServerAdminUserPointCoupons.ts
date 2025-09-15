import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPointCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new user point coupon usage record to represent coupon redemption by
 * a user.
 *
 * This operation validates the user's existence and activeness, coupon
 * availability and expiration, and whether the user has already redeemed the
 * coupon. It performs the creation and point balance update atomically to
 * ensure data consistency.
 *
 * @param props - Object containing the admin user performing the operation and
 *   the user point coupon usage data
 * @param props.admin - The authenticated admin payload
 * @param props.body - Data for creating a user point coupon usage record,
 *   including user ID, coupon ID, and usage timestamp
 * @returns The created user point coupon usage record with audit timestamps
 * @throws {Error} Throws error if user does not exist or inactive, coupon
 *   invalid or expired, already redeemed, or missing user points record
 */
export async function postoauthServerAdminUserPointCoupons(props: {
  admin: AdminPayload;
  body: IOauthServerUserPointCoupon.ICreate;
}): Promise<IOauthServerUserPointCoupon> {
  const { admin, body } = props;

  // Validate user existence and activeness
  const member = await MyGlobal.prisma.oauth_server_members.findFirst({
    where: { id: body.user_id, deleted_at: null },
    select: { id: true },
  });
  if (!member) throw new Error("User not found or inactive");

  // Validate coupon existence, activeness, and non-expiration
  const now = toISOStringSafe(new Date());
  const coupon = await MyGlobal.prisma.oauth_server_point_coupons.findFirst({
    where: {
      id: body.point_coupon_id,
      deleted_at: null,
      expire_at: { gt: now },
    },
    select: { id: true, value: true },
  });
  if (!coupon) throw new Error("Coupon not found, deleted, or expired");

  // Check if user has already redeemed this coupon
  const existing =
    await MyGlobal.prisma.oauth_server_user_point_coupons.findFirst({
      where: { user_id: body.user_id, point_coupon_id: body.point_coupon_id },
      select: { id: true },
    });
  if (existing) throw new Error("Coupon already redeemed by this user");

  // Transaction to create usage record and update user points balance
  const nowSafe = now;
  const id = v4() as string & tags.Format<"uuid">;

  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.oauth_server_user_point_coupons.create({
      data: {
        id,
        user_id: body.user_id,
        point_coupon_id: body.point_coupon_id,
        used_at: body.used_at,
        created_at: nowSafe,
        updated_at: nowSafe,
      },
    });

    const userPoint = await tx.oauth_server_user_points.findFirst({
      where: { user_id: body.user_id, deleted_at: null },
      select: { id: true, balance: true },
    });

    if (!userPoint) {
      throw new Error("User points record not found");
    }

    await tx.oauth_server_user_points.update({
      where: { id: userPoint.id },
      data: {
        balance: userPoint.balance + coupon.value,
        updated_at: nowSafe,
      },
    });

    return created;
  });

  return {
    id: result.id,
    user_id: result.user_id,
    point_coupon_id: result.point_coupon_id,
    used_at: result.used_at,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at ? toISOStringSafe(result.deleted_at) : null,
  };
}
