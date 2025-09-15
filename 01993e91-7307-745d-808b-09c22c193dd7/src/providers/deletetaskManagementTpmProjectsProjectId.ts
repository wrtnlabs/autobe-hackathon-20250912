import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Delete a specific project by projectId.
 *
 * This operation marks the project as deleted by setting the deleted_at
 * timestamp if the requesting TPM user is the owner of the project. Only the
 * project owner TPM can perform the deletion.
 *
 * No response body is returned upon success.
 *
 * @param props - Object containing TPM authentication and projectId to delete.
 * @param props.tpm - Authenticated TPM user payload.
 * @param props.projectId - UUID of the project to be deleted.
 * @throws {Error} If the project does not exist, is already deleted, or the TPM
 *   user is unauthorized.
 */
export async function deletetaskManagementTpmProjectsProjectId(props: {
  tpm: TpmPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { tpm, projectId } = props;

  // Find project by id - throws if not found
  const project =
    await MyGlobal.prisma.task_management_projects.findUniqueOrThrow({
      where: { id: projectId },
    });

  // Throw if already soft deleted
  if (project.deleted_at !== null) {
    throw new Error("Project already deleted");
  }

  // Authorization check: TPM user must be the owner
  if (project.owner_id !== tpm.id) {
    throw new Error("Unauthorized: TPM does not own this project");
  }

  // Prepare deleted_at timestamp
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  // Soft delete the project
  await MyGlobal.prisma.task_management_projects.update({
    where: { id: projectId },
    data: { deleted_at: deletedAt },
  });
}
