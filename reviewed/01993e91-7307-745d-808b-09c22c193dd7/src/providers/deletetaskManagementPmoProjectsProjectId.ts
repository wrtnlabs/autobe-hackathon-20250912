import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Delete a specific project by its unique projectId.
 *
 * This operation performs a soft delete if supported by setting the deleted_at
 * timestamp. Only authorized PMO users may perform this action.
 *
 * It throws errors if the project does not exist or has already been deleted.
 *
 * @param props - Object containing the authenticated PMO user and the target
 *   project ID
 * @param props.pmo - The authenticated PMO user performing the deletion
 * @param props.projectId - The UUID of the project to delete
 * @throws {Error} When the project does not exist or is already deleted
 */
export async function deletetaskManagementPmoProjectsProjectId(props: {
  pmo: PmoPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pmo, projectId } = props;

  // Ensure the project exists and is not deleted
  const project =
    await MyGlobal.prisma.task_management_projects.findFirstOrThrow({
      where: {
        id: projectId,
        deleted_at: null,
      },
    });

  // Mark deleted_at with current ISO timestamp for soft delete
  const deletedAt = toISOStringSafe(new Date());

  await MyGlobal.prisma.task_management_projects.update({
    where: { id: projectId },
    data: { deleted_at: deletedAt },
  });

  return;
}
