import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Create a new board in a project for a Project Manager (PM).
 *
 * This endpoint allows authenticated PM users to create a new Board under a
 * specific Project.
 *
 * Validates project existence, user ownership, and board code uniqueness within
 * the project.
 *
 * @param props - Object containing PM payload, projectId path param, and board
 *   creation body
 * @param props.pm - Authenticated PM payload
 * @param props.projectId - UUID of the target project
 * @param props.body - Board creation payload conforming to
 *   ITaskManagementBoard.ICreate
 * @returns The newly created ITaskManagementBoard entity with all its fields
 * @throws {Error} When the project with projectId does not exist
 * @throws {Error} When the PM user does not exist (should not happen if auth is
 *   reliable)
 * @throws {Error} When the board code is not unique within the same project
 */
export async function posttaskManagementPmProjectsProjectIdBoards(props: {
  pm: PmPayload;
  projectId: string & tags.Format<"uuid">;
  body: ITaskManagementBoard.ICreate;
}): Promise<ITaskManagementBoard> {
  const { pm, projectId, body } = props;

  // Verify that the target project exists
  await MyGlobal.prisma.task_management_projects.findUniqueOrThrow({
    where: { id: projectId },
  });

  // Verify PM user exists
  await MyGlobal.prisma.task_management_pm.findUniqueOrThrow({
    where: { id: pm.id },
  });

  // Check that the board code is unique within the project
  const existingBoard = await MyGlobal.prisma.task_management_boards.findFirst({
    where: {
      project_id: projectId,
      code: body.code,
    },
  });
  if (existingBoard) {
    throw new Error(`Board code '${body.code}' already exists in the project`);
  }

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create the new board
  const created = await MyGlobal.prisma.task_management_boards.create({
    data: {
      id: v4(),
      project_id: projectId,
      owner_id: pm.id,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created board entity
  return {
    id: created.id,
    project_id: created.project_id,
    owner_id: created.owner_id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
