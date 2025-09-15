import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Deletes a user point coupon record from the system by its unique identifier.
 *
 * This operation permanently removes the record from the
 * oauth_server_user_point_coupons table, erasing the association between a user
 * and a redeemed coupon.
 *
 * Only administrators with valid authorization can perform this action.
 *
 * @param props - Object containing required parameters
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.id - UUID of the user point coupon record to delete
 * @throws {Error} Throws if the record does not exist or deletion fails
 */
export async function deleteoauthServerAdminUserPointCouponsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  await MyGlobal.prisma.oauth_server_user_point_coupons.delete({
    where: { id },
  });
}
