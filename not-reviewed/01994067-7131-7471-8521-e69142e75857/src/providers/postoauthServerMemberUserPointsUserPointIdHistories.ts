import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserPointHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPointHistory";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Creates a new user point history entry linked to a specific user point
 * balance record.
 *
 * This operation records increments or decrements to user points, logging the
 * reason for the change. The userPointId parameter identifies the parent user
 * points record.
 *
 * Authorization is ensured via the member payload; the user point must exist.
 *
 * @param props - Object containing member payload, userPointId path parameter,
 *   and create body
 * @param props.member - Authenticated member payload
 * @param props.userPointId - UUID of the user points record to which the
 *   history entry belongs
 * @param props.body - Data for creating the user point history entry, including
 *   change amount, balance after change, and reason
 * @returns The newly created user point history entry with all fields populated
 * @throws {Error} If the user point record specified by userPointId does not
 *   exist
 */
export async function postoauthServerMemberUserPointsUserPointIdHistories(props: {
  member: MemberPayload;
  userPointId: string & tags.Format<"uuid">;
  body: IOauthServerUserPointHistory.ICreate;
}): Promise<IOauthServerUserPointHistory> {
  const { member, userPointId, body } = props;

  // Verify the user point record exists
  const userPoint = await MyGlobal.prisma.oauth_server_user_points.findUnique({
    where: { id: userPointId },
  });
  if (!userPoint) {
    throw new Error("User point record not found");
  }

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.oauth_server_user_point_histories.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_point_id: userPointId,
        change_amount: body.change_amount,
        balance_after_change: body.balance_after_change,
        reason: body.reason,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    user_point_id: created.user_point_id,
    change_amount: created.change_amount,
    balance_after_change: created.balance_after_change,
    reason: created.reason,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
