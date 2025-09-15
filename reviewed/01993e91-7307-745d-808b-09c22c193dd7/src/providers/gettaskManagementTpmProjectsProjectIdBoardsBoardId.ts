import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Retrieve detail of a board by projectId and boardId.
 *
 * This operation retrieves details of a specific board under a project by
 * projectId and boardId. Boards group tasks within projects and have unique
 * codes, owners, and descriptive metadata. Authorized users with TPM role may
 * access this endpoint.
 *
 * Soft-deleted boards (deleted_at != null) are excluded from retrieval.
 *
 * @param props - Object containing authentication and identifying parameters
 * @param props.tpm - Authenticated TPM user payload
 * @param props.projectId - UUID of the target project
 * @param props.boardId - UUID of the target board
 * @returns The detailed board information conforming to ITaskManagementBoard
 * @throws {Error} When the board is not found or the parameters are invalid
 */
export async function gettaskManagementTpmProjectsProjectIdBoardsBoardId(props: {
  tpm: TpmPayload;
  projectId: string & tags.Format<"uuid">;
  boardId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementBoard> {
  const { tpm, projectId, boardId } = props;

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
