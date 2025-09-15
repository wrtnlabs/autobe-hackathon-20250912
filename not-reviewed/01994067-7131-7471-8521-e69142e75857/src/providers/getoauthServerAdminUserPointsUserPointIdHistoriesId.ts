import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserPointHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPointHistory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves detailed information of a specific user point transaction history
 * record.
 *
 * Authorization: Admin only.
 *
 * @param props - Object containing authorization and identifying parameters.
 * @param props.admin - The authenticated admin user payload.
 * @param props.userPointId - UUID of the user point associated with the
 *   history.
 * @param props.id - UUID of the user point history record.
 * @returns Detailed user point transaction history record.
 * @throws Will throw if the specified history record does not exist or is
 *   deleted.
 */
export async function getoauthServerAdminUserPointsUserPointIdHistoriesId(props: {
  admin: AdminPayload;
  userPointId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerUserPointHistory> {
  const record =
    await MyGlobal.prisma.oauth_server_user_point_histories.findFirstOrThrow({
      where: {
        id: props.id,
        user_point_id: props.userPointId,
        deleted_at: null,
      },
    });

  return {
    id: record.id,
    user_point_id: record.user_point_id,
    change_amount: record.change_amount,
    balance_after_change: record.balance_after_change,
    reason: record.reason,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
