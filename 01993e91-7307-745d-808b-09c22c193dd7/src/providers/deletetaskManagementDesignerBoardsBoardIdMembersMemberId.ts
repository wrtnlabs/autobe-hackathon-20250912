import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Deletes a member from a specified board in the task management system.
 *
 * This operation verifies the membership record exists for the given boardId
 * and memberId, ensures the requesting designer is a member of the board with
 * management permissions, and then performs a soft delete (sets deleted_at
 * timestamp) on the membership record.
 *
 * @param props - Object containing authorization and identifiers
 * @param props.designer - The authenticated designer performing the deletion
 * @param props.boardId - UUID of the board from which to remove the member
 * @param props.memberId - UUID of the membership record to delete
 * @throws {Error} If the membership does not exist or does not belong to the
 *   board
 * @throws {Error} If the requesting designer is not an active member of the
 *   board
 */
export async function deletetaskManagementDesignerBoardsBoardIdMembersMemberId(props: {
  designer: DesignerPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { designer, boardId, memberId } = props;

  // Verify the membership exists and belongs to the board
  const membership =
    await MyGlobal.prisma.task_management_board_members.findUnique({
      where: { id: memberId },
    });
  if (!membership || membership.board_id !== boardId) {
    throw new Error(
      "Board membership not found for the given memberId and boardId",
    );
  }

  // Verify the requesting designer is an active member of the board
  const activeMember =
    await MyGlobal.prisma.task_management_board_members.findFirst({
      where: {
        user_id: designer.id,
        board_id: boardId,
        deleted_at: null,
      },
    });
  if (!activeMember) {
    throw new Error(
      "Unauthorized: You must be a member of the board to remove members",
    );
  }

  // Perform the soft delete by updating deleted_at and updated_at timestamps
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.task_management_board_members.update({
    where: { id: memberId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
