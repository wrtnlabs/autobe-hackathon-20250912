import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Delete a board member
 *
 * This operation removes a member association from a specified board by
 * deleting the membership record from task_management_board_members table.
 *
 * Authorization is required from QA users.
 *
 * @param props - Object containing the authenticated QA user and identifiers
 * @param props.qa - Authenticated QA user payload
 * @param props.boardId - UUID of the board
 * @param props.memberId - UUID of the member user to remove
 * @throws {Error} When the board member association does not exist
 */
export async function deletetaskManagementQaBoardsBoardIdMembersMemberId(props: {
  qa: QaPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { qa, boardId, memberId } = props;

  // Find existing membership record
  const membership =
    await MyGlobal.prisma.task_management_board_members.findFirst({
      where: {
        board_id: boardId,
        user_id: memberId,
        deleted_at: null,
      },
    });

  if (!membership) {
    throw new Error("Board member association not found");
  }

  // Authorization check can be implemented here if more granular control is needed

  // Delete membership by primary key id
  await MyGlobal.prisma.task_management_board_members.delete({
    where: {
      id: membership.id,
    },
  });
}
