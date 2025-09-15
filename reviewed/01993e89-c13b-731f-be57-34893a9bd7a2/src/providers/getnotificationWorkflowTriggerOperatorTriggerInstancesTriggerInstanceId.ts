import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import { TriggerOperatorPayload } from "../decorators/payload/TriggerOperatorPayload";

/**
 * Get detailed information of a specific TriggerInstance by ID.
 *
 * This function retrieves a trigger instance record from the database
 * identified by triggerInstanceId. It returns all details including workflow
 * association, idempotency key, status, execution cursor, retry attempts,
 * availability, payload, and audit timestamps. Returns a fully populated
 * INotificationWorkflowTriggerInstance.
 *
 * Authorization: Requires an authenticated triggerOperator.
 *
 * @param props - The request props containing triggerOperator and
 *   triggerInstanceId.
 * @param props.triggerOperator - Authenticated trigger operator payload.
 * @param props.triggerInstanceId - The unique UUID identifier for the trigger
 *   instance.
 * @returns The detailed trigger instance data matching provided ID.
 * @throws {Error} If the trigger instance with the specified ID is not found.
 */
export async function getnotificationWorkflowTriggerOperatorTriggerInstancesTriggerInstanceId(props: {
  triggerOperator: TriggerOperatorPayload;
  triggerInstanceId: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowTriggerInstance> {
  const { triggerOperator, triggerInstanceId } = props;

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
