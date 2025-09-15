import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Update an existing board within a project.
 *
 * This operation allows a PM user to update board details identified by boardId
 * and projectId. It performs authorization check that the PM is the owner of
 * the board.
 *
 * @param props - Object containing pm payload, projectId, boardId and update
 *   body
 * @param props.pm - Authenticated PM user payload
 * @param props.projectId - UUID of the project containing the board
 * @param props.boardId - UUID of the board to update
 * @param props.body - Partial board fields to update
 * @returns The updated ITaskManagementBoard entity
 * @throws {Error} When board not found
 * @throws {Error} When unauthorized access
 * @throws {Error} When board code conflicts
 */
export async function puttaskManagementPmProjectsProjectIdBoardsBoardId(props: {
  pm: PmPayload;
  projectId: string & tags.Format<"uuid">;
  boardId: string & tags.Format<"uuid">;
  body: ITaskManagementBoard.IUpdate;
}): Promise<ITaskManagementBoard> {
  const { pm, projectId, boardId, body } = props;

  // Verify board existence and non-deleted
  const board = await MyGlobal.prisma.task_management_boards.findFirst({
    where: { id: boardId, project_id: projectId, deleted_at: null },
  });
  if (!board) {
    throw new Error("Board not found");
  }

  // Authorization check - PM must be owner
  if (board.owner_id !== pm.id) {
    throw new Error("Unauthorized to update board");
  }

  // Uniqueness check on code if code provided
  if (body.code !== undefined) {
    const conflict = await MyGlobal.prisma.task_management_boards.findFirst({
      where: {
        project_id: projectId,
        code: body.code,
        id: { not: boardId },
        deleted_at: null,
      },
    });
    if (conflict) {
      throw new Error("Board code already exists in project");
    }
  }

  // Update the board
  const updated = await MyGlobal.prisma.task_management_boards.update({
    where: { id: boardId },
    data: {
      project_id: body.project_id ?? undefined,
      owner_id: body.owner_id ?? undefined,
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description: body.description ?? null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return updated board with ISO date strings
  return {
    id: updated.id as string & tags.Format<"uuid">,
    project_id: updated.project_id as string & tags.Format<"uuid">,
    owner_id: updated.owner_id as string & tags.Format<"uuid">,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
