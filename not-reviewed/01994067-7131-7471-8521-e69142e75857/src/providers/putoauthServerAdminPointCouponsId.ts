import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerPointCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerPointCoupon";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update details of an existing point coupon
 *
 * This operation updates an existing point coupon identified by its ID. Only
 * admins can perform this operation.
 *
 * @param props - The properties including admin, id, and update body
 * @returns The updated point coupon entity
 * @throws {Error} When the coupon does not exist or is soft deleted
 */
export async function putoauthServerAdminPointCouponsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerPointCoupon.IUpdate;
}): Promise<IOauthServerPointCoupon> {
  const { admin, id, body } = props;

  const existing = await MyGlobal.prisma.oauth_server_point_coupons.findUnique({
    where: { id },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new Error(`Point coupon not found or deleted: ${id}`);
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.oauth_server_point_coupons.update({
    where: { id },
    data: {
      code: body.code ?? undefined,
      description: body.description ?? undefined,
      value: body.value ?? undefined,
      max_issuance: body.max_issuance ?? undefined,
      expire_at: body.expire_at ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    description: updated.description ?? null,
    value: updated.value,
    max_issuance: updated.max_issuance,
    expire_at: toISOStringSafe(updated.expire_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
