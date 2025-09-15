import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Delete a TriggerInstance by ID permanently
 *
 * This operation deletes a TriggerInstance identified by its UUID from the
 * notification_workflow_trigger_instances table. Soft delete is not supported,
 * so the deletion is permanent. Only authorized system administrators can
 * perform this operation.
 *
 * @param props - Properties including authentication and path parameters
 * @param props.systemAdmin - The authenticated systemAdmin performing the
 *   operation
 * @param props.triggerInstanceId - The UUID of the TriggerInstance to delete
 * @throws {Error} Unauthorized if the systemAdmin is not found or soft deleted
 */
export async function deletenotificationWorkflowSystemAdminTriggerInstancesTriggerInstanceId(props: {
  systemAdmin: SystemAdminPayload;
  triggerInstanceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, triggerInstanceId } = props;

  // Authorization: Verify systemAdmin exists and not soft deleted
  const admin =
    await MyGlobal.prisma.notification_workflow_systemadmins.findFirst({
      where: {
        id: systemAdmin.id,
        deleted_at: null,
      },
    });
  if (!admin) {
    throw new Error("Unauthorized: SystemAdmin not found or deleted");
  }

  // Hard delete trigger instance
  await MyGlobal.prisma.notification_workflow_trigger_instances.delete({
    where: {
      id: triggerInstanceId,
    },
  });
}
