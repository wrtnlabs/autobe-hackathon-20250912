import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerPointCoupon";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieve details of a specific point coupon by its unique ID.
 *
 * This operation fetches detailed information about the point coupon, including
 * code, description, value, usage limits, expiration date, and audit
 * timestamps.
 *
 * Authorization: Requires developer role authentication.
 *
 * @param props - Object containing the authenticated developer and the unique
 *   coupon ID
 * @param props.developer - Authenticated developer payload
 * @param props.id - Unique identifier of the point coupon
 * @returns Detailed information about the point coupon
 * @throws {Error} When the point coupon with the specified ID is not found
 */
export async function getoauthServerDeveloperPointCouponsId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerPointCoupon> {
  const { developer, id } = props;

  const pointCoupon =
    await MyGlobal.prisma.oauth_server_point_coupons.findUnique({
      where: { id },
    });

  if (!pointCoupon) {
    throw new Error("Point coupon not found");
  }

  return {
    id: pointCoupon.id,
    code: pointCoupon.code,
    description: pointCoupon.description ?? undefined,
    value: pointCoupon.value,
    max_issuance: pointCoupon.max_issuance,
    expire_at: toISOStringSafe(pointCoupon.expire_at),
    created_at: toISOStringSafe(pointCoupon.created_at),
    updated_at: toISOStringSafe(pointCoupon.updated_at),
    deleted_at: pointCoupon.deleted_at
      ? toISOStringSafe(pointCoupon.deleted_at)
      : null,
  };
}
