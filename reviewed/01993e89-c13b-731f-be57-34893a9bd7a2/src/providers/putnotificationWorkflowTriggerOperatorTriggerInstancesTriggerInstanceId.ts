import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import { TriggerOperatorPayload } from "../decorators/payload/TriggerOperatorPayload";

/**
 * Update an existing TriggerInstance by its UUID.
 *
 * This operation allows modification of status, cursor position, retry
 * attempts, availability timestamp, and payload data. It is intended for
 * trigger operators to manage the lifecycle of trigger executions in
 * workflows.
 *
 * @param props - Object containing the authenticated trigger operator, the
 *   trigger instance ID, and the update body payload.
 * @param props.triggerOperator - The authenticated trigger operator performing
 *   the update.
 * @param props.triggerInstanceId - UUID of the TriggerInstance to update.
 * @param props.body - Partial update data for the TriggerInstance.
 * @returns The fully updated TriggerInstance record.
 * @throws {Error} When the specified TriggerInstance does not exist.
 */
export async function putnotificationWorkflowTriggerOperatorTriggerInstancesTriggerInstanceId(props: {
  triggerOperator: TriggerOperatorPayload;
  triggerInstanceId: string & tags.Format<"uuid">;
  body: INotificationWorkflowTriggerInstance.IUpdate;
}): Promise<INotificationWorkflowTriggerInstance> {
  const { triggerInstanceId, body } = props;

  // Verify that the TriggerInstance exists
  const existing =
    await MyGlobal.prisma.notification_workflow_trigger_instances.findUnique({
      where: { id: triggerInstanceId },
    });

  if (!existing) {
    throw new Error("TriggerInstance not found");
  }

  // Prepare update data - omit undefined fields
  const updateData: INotificationWorkflowTriggerInstance.IUpdate = {
    cursor_current_node_id: body.cursor_current_node_id ?? undefined,
    status: body.status ?? undefined,
    attempts: body.attempts ?? undefined,
    available_at: body.available_at ?? undefined,
    payload: body.payload ?? undefined,
  };

  // Perform the update
  const updated =
    await MyGlobal.prisma.notification_workflow_trigger_instances.update({
      where: { id: triggerInstanceId },
      data: updateData,
    });

  // Return the updated record with proper date string conversions
  return {
    id: updated.id,
    workflow_id: updated.workflow_id,
    idempotency_key: updated.idempotency_key,
    cursor_current_node_id: updated.cursor_current_node_id ?? null,
    status: updated.status,
    attempts: Number(updated.attempts),
    available_at: toISOStringSafe(updated.available_at),
    payload: updated.payload,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
