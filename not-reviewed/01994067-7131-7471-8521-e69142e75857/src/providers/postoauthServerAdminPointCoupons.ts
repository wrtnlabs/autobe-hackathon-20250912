import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerPointCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new point coupon used for granting points to users.
 *
 * This operation enables administrators to define new promotions or reward
 * coupons which users can redeem for points. It validates input and ensures the
 * uniqueness of coupon codes.
 *
 * @param props - Object containing admin authentication and point coupon
 *   creation data
 * @param props.admin - The authenticated admin user performing this operation
 * @param props.body - The input data for creating the point coupon
 * @returns The created point coupon details with system-generated IDs and
 *   timestamps
 * @throws {Error} When creation fails due to database errors or uniqueness
 *   constraints
 */
export async function postoauthServerAdminPointCoupons(props: {
  admin: AdminPayload;
  body: IOauthServerPointCoupon.ICreate;
}): Promise<IOauthServerPointCoupon> {
  const { admin, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.oauth_server_point_coupons.create({
    data: {
      id,
      code: body.code,
      description: body.description ?? null,
      value: body.value,
      max_issuance: body.max_issuance,
      expire_at: toISOStringSafe(body.expire_at),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    code: created.code,
    description: created.description ?? null,
    value: created.value,
    max_issuance: created.max_issuance,
    expire_at: toISOStringSafe(created.expire_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
