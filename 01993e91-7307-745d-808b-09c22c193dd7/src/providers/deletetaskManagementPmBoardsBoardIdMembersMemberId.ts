import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Deletes a board member association.
 *
 * This operation removes the membership record linking a user to a board in the
 * task_management_board_members table. It performs a hard delete and ensures
 * the membership exists and is active.
 *
 * Authorization is assumed to be provided via the 'pm' payload.
 *
 * @param props - Object containing the authenticated pm user and path
 *   parameters.
 * @param props.pm - The authenticated PM user payload performing the deletion.
 * @param props.boardId - UUID of the board from which to remove the member.
 * @param props.memberId - UUID of the member user to be removed.
 * @returns Void
 * @throws {Error} If the membership record does not exist.
 */
export async function deletetaskManagementPmBoardsBoardIdMembersMemberId(props: {
  pm: PmPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pm, boardId, memberId } = props;

  // Find the membership record; throws if not found
  const membership =
    await MyGlobal.prisma.task_management_board_members.findFirstOrThrow({
      where: {
        board_id: boardId,
        user_id: memberId,
        deleted_at: null,
      },
    });

  // Perform hard delete of the membership by id
  await MyGlobal.prisma.task_management_board_members.delete({
    where: { id: membership.id },
  });
}
