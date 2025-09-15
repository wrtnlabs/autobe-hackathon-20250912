import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Deletes a board member association from a specific board in the Task
 * Management system.
 *
 * This operation removes the membership record linking the specified member
 * (memberId) to the board (boardId). The deletion is permanent (hard delete).
 *
 * Authorization: Requires TPM user authenticated and authorized.
 *
 * @param props - Object containing the TPM user payload, boardId, and memberId.
 * @param props.tpm - The authenticated TPM user performing the deletion.
 * @param props.boardId - The UUID of the board from which to remove the member.
 * @param props.memberId - The UUID of the board member to be removed.
 * @throws {Error} When the membership record does not exist.
 */
export async function deletetaskManagementTpmBoardsBoardIdMembersMemberId(props: {
  tpm: TpmPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { tpm, boardId, memberId } = props;

  // Verify the membership record exists and is not soft deleted
  const membership =
    await MyGlobal.prisma.task_management_board_members.findFirst({
      where: {
        id: memberId,
        board_id: boardId,
        deleted_at: null,
      },
    });

  if (!membership) {
    throw new Error("Membership not found");
  }

  // Proceed to delete the membership record (hard delete)
  await MyGlobal.prisma.task_management_board_members.delete({
    where: { id: memberId },
  });
}
