import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a point coupon by marking its deletedAt timestamp.
 *
 * This operation restricts physical removal to maintain historical data for
 * audit and compliance purposes. Access is limited to administrators only.
 *
 * @param props - Properties containing admin payload and the ID of the coupon
 *   to delete
 * @param props.admin - Authenticated administrator performing the deletion
 * @param props.id - Unique identifier of the point coupon to delete
 * @throws {Error} If the point coupon is not found or already deleted
 */
export async function deleteoauthServerAdminPointCouponsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Fetch the point coupon record which is not deleted
  const coupon = await MyGlobal.prisma.oauth_server_point_coupons.findFirst({
    where: {
      id: id,
      deleted_at: null,
    },
  });

  if (coupon === null) {
    throw new Error("Point coupon not found or already deleted");
  }

  const deletedAt = toISOStringSafe(new Date());

  // Mark the coupon as deleted by setting deleted_at timestamp
  await MyGlobal.prisma.oauth_server_point_coupons.update({
    where: { id: id },
    data: { deleted_at: deletedAt },
  });
}
