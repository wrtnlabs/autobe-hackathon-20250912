import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Delete a board from a project.
 *
 * Allows TPM users to delete a board within a specified project. Performs a
 * soft delete by setting deleted_at timestamp. Authorization requires the TPM
 * user to be the owner of the board.
 *
 * @param props - Request properties
 * @param props.tpm - Authenticated TPM user making the request
 * @param props.projectId - UUID of the project containing the board
 * @param props.boardId - UUID of the board to delete
 * @throws {Error} Unauthorized if the TPM user does not own the board
 * @throws {Error} When the board does not exist or is already deleted
 */
export async function deletetaskManagementTpmProjectsProjectIdBoardsBoardId(props: {
  tpm: TpmPayload;
  projectId: string & tags.Format<"uuid">;
  boardId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { tpm, projectId, boardId } = props;

  // Retrieve the board ensuring it exists and is not deleted
  const board = await MyGlobal.prisma.task_management_boards.findFirstOrThrow({
    where: {
      id: boardId,
      project_id: projectId,
      deleted_at: null,
    },
  });

  // Authorization check: only owner can delete
  if (board.owner_id !== tpm.id) {
    throw new Error("Unauthorized: TPM user does not own the board");
  }

  // Prepare deleted_at timestamp string
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  // Soft delete the board by setting deleted_at
  await MyGlobal.prisma.task_management_boards.update({
    where: { id: boardId },
    data: { deleted_at: deletedAt },
  });
}
