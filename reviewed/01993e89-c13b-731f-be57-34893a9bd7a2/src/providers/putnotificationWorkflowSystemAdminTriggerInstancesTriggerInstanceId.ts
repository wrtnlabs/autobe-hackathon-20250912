import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Update an existing TriggerInstance by ID
 *
 * This operation updates specified fields of a TriggerInstance including
 * status, cursor, attempts, availability timing, and payload data. It enables
 * refined control over the trigger execution lifecycle. Access is restricted to
 * authorized system administrators.
 *
 * @param props - Object containing systemAdmin authentication,
 *   triggerInstanceId, and update body
 * @returns Updated TriggerInstance details
 * @throws Error if the trigger instance with given ID is not found
 */
export async function putnotificationWorkflowSystemAdminTriggerInstancesTriggerInstanceId(props: {
  systemAdmin: SystemAdminPayload;
  triggerInstanceId: string & tags.Format<"uuid">;
  body: INotificationWorkflowTriggerInstance.IUpdate;
}): Promise<INotificationWorkflowTriggerInstance> {
  const { systemAdmin, triggerInstanceId, body } = props;

  const existing =
    await MyGlobal.prisma.notification_workflow_trigger_instances.findUniqueOrThrow(
      {
        where: { id: triggerInstanceId },
      },
    );

  const updated =
    await MyGlobal.prisma.notification_workflow_trigger_instances.update({
      where: { id: triggerInstanceId },
      data: {
        cursor_current_node_id: body.cursor_current_node_id ?? undefined,
        status: body.status ?? undefined,
        attempts: body.attempts ?? undefined,
        available_at: body.available_at ?? undefined,
        payload: body.payload ?? undefined,
      },
    });

  return {
    id: updated.id,
    workflow_id: updated.workflow_id,
    idempotency_key: updated.idempotency_key,
    cursor_current_node_id:
      updated.cursor_current_node_id === null
        ? null
        : (updated.cursor_current_node_id ?? undefined),
    status: updated.status,
    attempts: updated.attempts,
    available_at: toISOStringSafe(updated.available_at),
    payload: updated.payload,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
