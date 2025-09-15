import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserPointHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPointHistory";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update a specific user point history entry.
 *
 * This operation updates an existing point transaction history record linked to
 * a user point account. It checks that the record exists and belongs to the
 * specified user point. Only the fields change_amount, reason,
 * balance_after_change, and deleted_at can be modified.
 *
 * Authorization is verified by matching user_point_id with the provided
 * userPointId path parameter.
 *
 * @param props - Object containing the member payload, userPointId, record id,
 *   and update body
 * @returns The updated IOauthServerUserPointHistory record
 * @throws {Error} If the specified history record is not found or unauthorized
 *   access attempt
 */
export async function putoauthServerMemberUserPointsUserPointIdHistoriesId(props: {
  member: MemberPayload;
  userPointId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IOauthServerUserPointHistory.IUpdate;
}): Promise<IOauthServerUserPointHistory> {
  const { member, userPointId, id, body } = props;

  // Verify the user point history record exists
  const existing =
    await MyGlobal.prisma.oauth_server_user_point_histories.findUnique({
      where: { id },
    });

  if (!existing) {
    throw new Error("User point history record not found");
  }

  // Verify ownership by userPointId
  if (existing.user_point_id !== userPointId) {
    throw new Error("Unauthorized to update this user point history");
  }

  const now = toISOStringSafe(new Date());

  // Build update data object
  const updateData: IOauthServerUserPointHistory.IUpdate = {};

  if (body.change_amount !== undefined) {
    updateData.change_amount = body.change_amount;
  }

  if (body.balance_after_change !== undefined) {
    updateData.balance_after_change = body.balance_after_change;
  }

  if (body.reason !== undefined) {
    updateData.reason = body.reason === null ? null : body.reason;
  }

  if (body.deleted_at !== undefined) {
    updateData.deleted_at = body.deleted_at === null ? null : body.deleted_at;
  }

  updateData.updated_at = now;

  // Perform the update
  const updated =
    await MyGlobal.prisma.oauth_server_user_point_histories.update({
      where: { id },
      data: updateData,
    });

  // Return the updated record with date fields converted
  return {
    id: updated.id,
    user_point_id: updated.user_point_id,
    change_amount: updated.change_amount,
    balance_after_change: updated.balance_after_change,
    reason: updated.reason,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
