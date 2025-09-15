import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Create a new board in a project.
 *
 * This operation creates a new Board under a specific Project, according to the
 * task_management_boards table model.
 *
 * It ensures the project exists and the TPM user is valid and not deleted.
 * Enforces board code uniqueness within the project. Assigns timestamps for
 * creation and update.
 *
 * @param props - Object containing TPM authenticated user, project ID, and
 *   board creation details
 * @param props.tpm - Authenticated TPM user payload
 * @param props.projectId - UUID of the target project
 * @param props.body - Board creation parameters conforming to
 *   ITaskManagementBoard.ICreate
 * @returns The newly created board entity with complete details
 * @throws {Error} When the project does not exist or is deleted
 * @throws {Error} When the TPM owner user does not exist or is deleted
 * @throws {Error} When the board code is already taken in the project
 */
export async function posttaskManagementTpmProjectsProjectIdBoards(props: {
  tpm: TpmPayload;
  projectId: string & tags.Format<"uuid">;
  body: ITaskManagementBoard.ICreate;
}): Promise<ITaskManagementBoard> {
  const { tpm, projectId, body } = props;

  // Verify the project exists and is not deleted
  const project = await MyGlobal.prisma.task_management_projects.findUnique({
    where: { id: projectId },
    select: { id: true, deleted_at: true },
  });

  if (!project || project.deleted_at !== null) {
    throw new Error(`Project ${projectId} does not exist or is deleted.`);
  }

  // Verify the TPM user exists and is not deleted
  const owner = await MyGlobal.prisma.task_management_tpm.findUnique({
    where: { id: tpm.id },
    select: { id: true, deleted_at: true },
  });
  if (!owner || owner.deleted_at !== null) {
    throw new Error(`Owner TPM user ${tpm.id} does not exist or is deleted.`);
  }

  // Check unique board code for project
  const existingBoard = await MyGlobal.prisma.task_management_boards.findFirst({
    where: {
      project_id: projectId,
      code: body.code,
      deleted_at: null,
    },
  });
  if (existingBoard) {
    throw new Error(
      `Board code '${body.code}' already exists in project ${projectId}.`,
    );
  }

  const now = toISOStringSafe(new Date());

  const createdBoard = await MyGlobal.prisma.task_management_boards.create({
    data: {
      id: v4(),
      project_id: projectId,
      owner_id: tpm.id,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: createdBoard.id,
    project_id: createdBoard.project_id,
    owner_id: createdBoard.owner_id,
    code: createdBoard.code,
    name: createdBoard.name,
    description: createdBoard.description ?? null,
    created_at: createdBoard.created_at as string & tags.Format<"date-time">,
    updated_at: createdBoard.updated_at as string & tags.Format<"date-time">,
    deleted_at: createdBoard.deleted_at ?? null,
  };
}
