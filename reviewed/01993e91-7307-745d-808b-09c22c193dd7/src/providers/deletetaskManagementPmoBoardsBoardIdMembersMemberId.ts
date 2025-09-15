import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Deletes a board member association from the specified board.
 *
 * This operation removes the linkage between the specified user (memberId) and
 * board (boardId) from the task_management_board_members table.
 *
 * Only authorized Project Management Officers (PMO) can perform this operation.
 *
 * @param props - Object containing authorization and path parameters
 * @param props.pmo - The authenticated PMO user performing the operation
 * @param props.boardId - UUID of the board from which the member is to be
 *   removed
 * @param props.memberId - UUID of the member to be removed from the board
 * @returns Void
 * @throws {Error} When the membership linking the member to the board is not
 *   found
 */
export async function deletetaskManagementPmoBoardsBoardIdMembersMemberId(props: {
  pmo: PmoPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pmo, boardId, memberId } = props;

  // Check if the membership record exists
  const membership =
    await MyGlobal.prisma.task_management_board_members.findFirst({
      where: {
        board_id: boardId,
        user_id: memberId,
      },
    });

  if (!membership) {
    throw new Error("Membership not found");
  }

  // Proceed to hard delete the membership record by ID
  await MyGlobal.prisma.task_management_board_members.delete({
    where: {
      id: membership.id,
    },
  });
}
