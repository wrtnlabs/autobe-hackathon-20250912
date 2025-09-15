import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPointCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing user point coupon usage record by unique ID.
 *
 * Allows modification of coupon usage details with validations to ensure
 * integrity. Restricted to admin roles only for security and audit compliance.
 * Returns the updated user point coupon usage record after changes.
 *
 * @param props - Object containing the admin payload, target record ID, and
 *   update body
 * @param props.admin - The authenticated admin user performing the update
 * @param props.id - UUID of the user point coupon usage record to update
 * @param props.body - Update data including optional user_id, point_coupon_id,
 *   and used_at
 * @returns The updated user point coupon usage record including audit fields
 * @throws {Error} Throws if the specified record does not exist
 */
export async function putoauthServerAdminUserPointCouponsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerUserPointCoupon.IUpdate;
}): Promise<IOauthServerUserPointCoupon> {
  const { admin, id, body } = props;

  // Authorization check assumed external as 'admin' param is provided

  // Ensure record exists
  await MyGlobal.prisma.oauth_server_user_point_coupons.findUniqueOrThrow({
    where: { id },
  });

  // Prepare update data with proper null/undefined distinction
  const data = {
    ...(body.user_id !== undefined ? { user_id: body.user_id } : {}),
    ...(body.point_coupon_id !== undefined
      ? { point_coupon_id: body.point_coupon_id }
      : {}),
    ...(body.used_at !== undefined
      ? {
          used_at: body.used_at === null ? null : toISOStringSafe(body.used_at),
        }
      : {}),
  };

  // Perform update
  const updated = await MyGlobal.prisma.oauth_server_user_point_coupons.update({
    where: { id },
    data,
  });

  // Convert Date fields to ISO string format
  return {
    id: updated.id,
    user_id: updated.user_id,
    point_coupon_id: updated.point_coupon_id,
    used_at: toISOStringSafe(updated.used_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
