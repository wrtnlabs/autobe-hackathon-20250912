import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Update an existing board within a project.
 *
 * This operation allows a TPM role user to update the specified board's
 * details, including code, name, description, and ownership within a project.
 *
 * Authorization ensures only the TPM who owns the project or the board may
 * update it.
 *
 * Validations ensure the board belongs to the specified project and that the
 * board code is unique within the project.
 *
 * @param props - Input properties including authenticated TPM payload, IDs, and
 *   update data
 * @returns The updated board entity with all current attributes
 * @throws {Error} If project or board does not exist, or if authorization fails
 * @throws {Error} If board code is not unique within the project
 */
export async function puttaskManagementTpmProjectsProjectIdBoardsBoardId(props: {
  tpm: TpmPayload;
  projectId: string & tags.Format<"uuid">;
  boardId: string & tags.Format<"uuid">;
  body: ITaskManagementBoard.IUpdate;
}): Promise<ITaskManagementBoard> {
  const { tpm, projectId, boardId, body } = props;

  // Validate project existence
  const project = await MyGlobal.prisma.task_management_projects.findUnique({
    where: { id: projectId },
  });
  if (!project) {
    throw new Error("Project not found");
  }

  // Validate board existence
  const board = await MyGlobal.prisma.task_management_boards.findUnique({
    where: { id: boardId },
  });
  if (!board) {
    throw new Error("Board not found");
  }

  // Ensure board belongs to the project
  if (board.project_id !== projectId) {
    throw new Error("Board does not belong to the specified project");
  }

  // Authorize TPM user
  if (tpm.id !== project.owner_id && tpm.id !== board.owner_id) {
    throw new Error("Unauthorized");
  }

  // If code is changed, check uniqueness
  if (body.code !== undefined && body.code !== board.code) {
    const existing = await MyGlobal.prisma.task_management_boards.findFirst({
      where: {
        project_id: projectId,
        code: body.code,
        id: { not: boardId },
      },
    });
    if (existing) {
      throw new Error("Board code must be unique within the project");
    }
  }

  // Prepare update data
  const updated_at = toISOStringSafe(new Date());

  const updateData: ITaskManagementBoard.IUpdate = {
    project_id: body.project_id ?? undefined,
    owner_id: body.owner_id ?? undefined,
    code: body.code ?? undefined,
    name: body.name ?? undefined,
    description: body.description ?? undefined,
  };

  // Update and return
  const updated = await MyGlobal.prisma.task_management_boards.update({
    where: { id: boardId },
    data: {
      ...updateData,
      updated_at,
    },
  });

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
