import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Deletes a board member association from a specified board.
 *
 * This operation removes the membership record linking a user to a board in the
 * `task_management_board_members` table.
 *
 * Authorization:
 *
 * - The requesting developer must be either the board owner or the member being
 *   removed.
 *
 * @param props - Object containing the authenticated developer and identifiers
 * @param props.developer - The authenticated developer performing the operation
 * @param props.boardId - Unique identifier of the board
 * @param props.memberId - Unique identifier of the membership to be deleted
 * @returns Void
 * @throws {Error} If the membership or board does not exist
 * @throws {Error} If the developer is unauthorized to perform the deletion
 */
export async function deletetaskManagementDeveloperBoardsBoardIdMembersMemberId(props: {
  developer: DeveloperPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { developer, boardId, memberId } = props;

  const membership =
    await MyGlobal.prisma.task_management_board_members.findFirst({
      where: {
        id: memberId,
        board_id: boardId,
      },
    });

  if (!membership) {
    throw new Error("Membership not found");
  }

  const board = await MyGlobal.prisma.task_management_boards.findUnique({
    where: {
      id: boardId,
    },
    select: {
      owner_id: true,
    },
  });

  if (!board) {
    throw new Error("Board not found");
  }

  if (developer.id !== board.owner_id && developer.id !== membership.user_id) {
    throw new Error("Unauthorized: You cannot remove this board member");
  }

  await MyGlobal.prisma.task_management_board_members.delete({
    where: {
      id: memberId,
    },
  });
}
