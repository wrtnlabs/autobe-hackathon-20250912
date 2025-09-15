import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerPointCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a specific point coupon by ID.
 *
 * This operation fetches the point coupon from the OAuth server database by its
 * unique ID. It returns all coupon details including code, description, value,
 * usage limits, expiration date, and audit timestamps.
 *
 * Authorization: Requires an authenticated admin.
 *
 * @param props - Object containing admin authentication and coupon ID.
 * @param props.admin - The authenticated admin user making the request.
 * @param props.id - UUID of the point coupon to retrieve.
 * @returns The detailed point coupon information.
 * @throws {Error} Throws if the point coupon with provided ID does not exist.
 */
export async function getoauthServerAdminPointCouponsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerPointCoupon> {
  const { admin, id } = props;

  // Authorization is implied by the admin payload existence

  const coupon =
    await MyGlobal.prisma.oauth_server_point_coupons.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: coupon.id as string & tags.Format<"uuid">,
    code: coupon.code,
    description: coupon.description ?? null,
    value: coupon.value,
    max_issuance: coupon.max_issuance,
    expire_at: toISOStringSafe(coupon.expire_at),
    created_at: toISOStringSafe(coupon.created_at),
    updated_at: toISOStringSafe(coupon.updated_at),
    deleted_at: coupon.deleted_at ? toISOStringSafe(coupon.deleted_at) : null,
  };
}
