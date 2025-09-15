import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Delete a specific project by projectId.
 *
 * This operation performs a soft delete on the project by setting the
 * deleted_at timestamp. Only authorized PM users may perform this operation.
 *
 * @param props - Object containing the PM payload and project ID
 * @param props.pm - The authenticated PM performing the delete
 * @param props.projectId - The UUID of the project to delete
 * @throws {Error} Throws if the project does not exist or is already deleted
 */
export async function deletetaskManagementPmProjectsProjectId(props: {
  pm: PmPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pm, projectId } = props;

  // Verify project exists and is not already deleted
  await MyGlobal.prisma.task_management_projects.findFirstOrThrow({
    where: {
      id: projectId,
      deleted_at: null,
    },
  });

  // Perform soft delete by setting deleted_at timestamp to current time
  await MyGlobal.prisma.task_management_projects.update({
    where: { id: projectId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
