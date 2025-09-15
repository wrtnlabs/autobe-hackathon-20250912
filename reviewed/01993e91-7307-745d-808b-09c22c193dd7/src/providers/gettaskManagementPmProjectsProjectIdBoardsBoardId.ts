import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Retrieve detail of a board by projectId and boardId
 *
 * This operation fetches the board entity identified by the given projectId and
 * boardId. It is restricted to users with the PM role.
 *
 * The returned board includes its unique code, name, description, project
 * ownership, and timestamps for creation, update, and optional soft deletion.
 *
 * @param props - Object containing authorization and path parameters
 * @param props.pm - Authenticated PM user payload
 * @param props.projectId - UUID string identifying the project
 * @param props.boardId - UUID string identifying the board
 * @returns The detailed board information conforming to ITaskManagementBoard
 * @throws {Error} Throws if no matching board is found
 */
export async function gettaskManagementPmProjectsProjectIdBoardsBoardId(props: {
  pm: PmPayload;
  projectId: string & tags.Format<"uuid">;
  boardId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementBoard> {
  const { pm, projectId, boardId } = props;

  const board = await MyGlobal.prisma.task_management_boards.findFirstOrThrow({
    where: {
      id: boardId,
      project_id: projectId,
      deleted_at: null,
    },
  });

  return {
    id: board.id,
    project_id: board.project_id,
    owner_id: board.owner_id,
    code: board.code,
    name: board.name,
    description: board.description ?? null,
    created_at: toISOStringSafe(board.created_at),
    updated_at: toISOStringSafe(board.updated_at),
    deleted_at: board.deleted_at ? toISOStringSafe(board.deleted_at) : null,
  };
}
