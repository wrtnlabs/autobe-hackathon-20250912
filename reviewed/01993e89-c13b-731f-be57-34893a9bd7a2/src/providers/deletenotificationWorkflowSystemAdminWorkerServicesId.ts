import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Delete a WorkerService user account
 *
 * Permanently delete a WorkerService user account from the Notification
 * Workflow system by unique ID. The deletion is a hard delete, removing the
 * record irreversibly. Access is restricted to authenticated system
 * administrators only.
 *
 * @param props - Parameters including system admin authentication and the
 *   target worker service ID
 * @param props.systemAdmin - Authenticated system administrator performing the
 *   deletion
 * @param props.id - UUID of the WorkerService user to be deleted
 * @throws {Error} Throws if the WorkerService user does not exist
 */
export async function deletenotificationWorkflowSystemAdminWorkerServicesId(props: {
  systemAdmin: SystemAdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, id } = props;

  // Validate the WorkerService exists
  await MyGlobal.prisma.notification_workflow_workerservices.findUniqueOrThrow({
    where: { id },
  });

  // Hard delete the WorkerService user account
  await MyGlobal.prisma.notification_workflow_workerservices.delete({
    where: { id },
  });
}
