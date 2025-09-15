import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPointCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information for a specific user point coupon usage record
 * by its unique identifier.
 *
 * This operation is restricted to administrators and returns full details of
 * the coupon usage, including linked user and coupon IDs, usage timestamp,
 * creation and update timestamps, and soft deletion status.
 *
 * @param props - The request properties.
 * @param props.admin - The authenticated administrator invoking this operation.
 * @param props.id - The unique identifier of the user point coupon usage
 *   record.
 * @returns The detailed user point coupon usage record.
 * @throws {Error} When no user point coupon usage record exists for the given
 *   ID.
 */
export async function getoauthServerAdminUserPointCouponsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerUserPointCoupon> {
  const { admin, id } = props;

  // Find the usage record by ID
  const record =
    await MyGlobal.prisma.oauth_server_user_point_coupons.findUnique({
      where: { id },
    });

  // Validate existence and soft delete status
  if (!record || record.deleted_at !== null) {
    throw new Error(`User point coupon not found: ${id}`);
  }

  // Return properly typed and transformed record
  return {
    id: record.id,
    user_id: record.user_id,
    point_coupon_id: record.point_coupon_id,
    used_at: toISOStringSafe(record.used_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
