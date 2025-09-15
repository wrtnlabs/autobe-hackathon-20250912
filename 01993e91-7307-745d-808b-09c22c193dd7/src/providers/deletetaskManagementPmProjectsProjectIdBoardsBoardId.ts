import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Delete a board from a project.
 *
 * Allows a PM user to soft delete a board under a specified project. Performs
 * ownership verification and sets the 'deleted_at' timestamp. Throws an error
 * if not found or unauthorized.
 *
 * @param props - Parameters including authenticated PM payload, projectId, and
 *   boardId.
 * @returns Void
 * @throws {Error} Board not found or already deleted.
 * @throws {Error} Unauthorized if PM is not the owner of the board.
 */
export async function deletetaskManagementPmProjectsProjectIdBoardsBoardId(props: {
  pm: PmPayload;
  projectId: string & tags.Format<"uuid">;
  boardId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pm, projectId, boardId } = props;

  const board = await MyGlobal.prisma.task_management_boards.findFirst({
    where: {
      id: boardId,
      project_id: projectId,
      deleted_at: null,
    },
  });

  if (board === null) {
    throw new Error("Board not found or already deleted");
  }

  if (board.owner_id !== pm.id) {
    throw new Error("Unauthorized: Only board owner can delete this board");
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.task_management_boards.update({
    where: { id: boardId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
