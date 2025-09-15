import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Update a specific project by projectId.
 *
 * This operation updates project details such as the owner (a TPM user), unique
 * code, descriptive name, and optional description. The record's update
 * timestamp is also set.
 *
 * Authorization: Only users with PMO role allowed.
 *
 * @param props - Object containing authorization payload, projectId, and update
 *   body
 * @param props.pmo - Authenticated PMO user payload
 * @param props.projectId - UUID string identifying the project to update
 * @param props.body - Partial fields to update conforming to
 *   ITaskManagementProject.IUpdate
 * @returns The full updated project record conforming to ITaskManagementProject
 * @throws {Error} Throws if project or owner (if specified) is not found
 */
export async function puttaskManagementPmoProjectsProjectId(props: {
  pmo: PmoPayload;
  projectId: string & tags.Format<"uuid">;
  body: ITaskManagementProject.IUpdate;
}): Promise<ITaskManagementProject> {
  const { pmo, projectId, body } = props;

  // Verify the project exists
  const project =
    await MyGlobal.prisma.task_management_projects.findUniqueOrThrow({
      where: { id: projectId },
    });

  // Verify new owner exists if owner_id is provided
  if (body.owner_id !== undefined) {
    await MyGlobal.prisma.task_management_tpm.findUniqueOrThrow({
      where: { id: body.owner_id },
    });
  }

  const now = toISOStringSafe(new Date());

  // Update the project
  const updated = await MyGlobal.prisma.task_management_projects.update({
    where: { id: projectId },
    data: {
      owner_id: body.owner_id ?? undefined,
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description:
        body.description === null ? null : (body.description ?? undefined),
      updated_at: now,
    },
  });

  // Return with date conversions and proper null handling
  return {
    id: updated.id,
    owner_id: updated.owner_id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
