import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieve detail of a board by projectId and boardId.
 *
 * This operation retrieves details of a specific board under a project
 * identified by projectId and boardId. Boards are logical groupings of tasks
 * within projects that have unique codes, owners, names, and descriptions. Only
 * authorized PMO users can access this information.
 *
 * @param props - Object containing authorization payload and path parameters.
 * @param props.pmo - The authenticated PMO user payload.
 * @param props.projectId - UUID of the project containing the board.
 * @param props.boardId - UUID of the board to retrieve.
 * @returns The detailed board information conforming to ITaskManagementBoard.
 * @throws {Error} When no board matches the specified projectId and boardId.
 */
export async function gettaskManagementPmoProjectsProjectIdBoardsBoardId(props: {
  pmo: PmoPayload;
  projectId: string & tags.Format<"uuid">;
  boardId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementBoard> {
  const { pmo, projectId, boardId } = props;

  const board = await MyGlobal.prisma.task_management_boards.findUniqueOrThrow({
    where: { id: boardId, project_id: projectId, deleted_at: null },
  });

  return {
    id: board.id,
    project_id: board.project_id,
    owner_id: board.owner_id,
    code: board.code,
    name: board.name,
    description: board.description ?? undefined,
    created_at: toISOStringSafe(board.created_at),
    updated_at: toISOStringSafe(board.updated_at),
    deleted_at: board.deleted_at ? toISOStringSafe(board.deleted_at) : null,
  };
}
