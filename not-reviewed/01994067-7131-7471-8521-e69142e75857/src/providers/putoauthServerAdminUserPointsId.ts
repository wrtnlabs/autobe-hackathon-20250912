import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPoint";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a user point balance record.
 *
 * This operation updates the balance and soft delete timestamp (deleted_at) of
 * a user point record identified by its unique ID. It requires admin
 * authorization.
 *
 * @param props - Parameters containing admin payload, ID, and update body
 * @param props.admin - The authenticated admin user performing the update
 * @param props.id - UUID of the user point record to update
 * @param props.body - Update data for the user point record (balance,
 *   deleted_at)
 * @returns The updated user point record with date fields as ISO strings
 * @throws {Error} If the user point record does not exist
 */
export async function putoauthServerAdminUserPointsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerUserPoint.IUpdate;
}): Promise<IOauthServerUserPoint> {
  const { admin, id, body } = props;

  // Ensure record exists
  const existing =
    await MyGlobal.prisma.oauth_server_user_points.findUniqueOrThrow({
      where: { id },
    });

  // Update the record
  const updated = await MyGlobal.prisma.oauth_server_user_points.update({
    where: { id },
    data: {
      balance: body.balance ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  // Return with date strings
  return {
    id: updated.id,
    user_id: updated.user_id,
    balance: updated.balance,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
