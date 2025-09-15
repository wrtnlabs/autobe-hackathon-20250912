import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Get detailed information of a specific TriggerInstance by ID
 *
 * This operation retrieves detailed information of a notification workflow
 * trigger instance by its unique UUID identifier. It includes the trigger's
 * current status, execution cursor, retry attempts, scheduling availability,
 * payload for execution context, and audit timestamps.
 *
 * Authorization is enforced by requiring a valid systemAdmin payload.
 *
 * @param props - Object containing the systemAdmin payload and the
 *   triggerInstanceId
 * @param props.systemAdmin - The authenticated system administrator
 * @param props.triggerInstanceId - Unique UUID identifier of the trigger
 *   instance
 * @returns Detailed information of the specified trigger instance
 * @throws {Error} Throws if the trigger instance with the given ID does not
 *   exist
 */
export async function getnotificationWorkflowSystemAdminTriggerInstancesTriggerInstanceId(props: {
  systemAdmin: SystemAdminPayload;
  triggerInstanceId: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowTriggerInstance> {
  const { systemAdmin, triggerInstanceId } = props;

  const triggerInstance =
    await MyGlobal.prisma.notification_workflow_trigger_instances.findUniqueOrThrow(
      {
        where: { id: triggerInstanceId },
      },
    );

  return {
    id: triggerInstance.id,
    workflow_id: triggerInstance.workflow_id,
    idempotency_key: triggerInstance.idempotency_key,
    cursor_current_node_id: triggerInstance.cursor_current_node_id ?? undefined,
    status: triggerInstance.status,
    attempts: triggerInstance.attempts,
    available_at: toISOStringSafe(triggerInstance.available_at),
    payload: triggerInstance.payload,
    created_at: toISOStringSafe(triggerInstance.created_at),
    updated_at: toISOStringSafe(triggerInstance.updated_at),
  };
}
