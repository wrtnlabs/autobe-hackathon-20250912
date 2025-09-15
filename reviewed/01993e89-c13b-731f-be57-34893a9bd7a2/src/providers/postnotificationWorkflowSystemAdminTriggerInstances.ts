import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Create a new TriggerInstance with idempotency enforcement.
 *
 * This operation creates a new TriggerInstance for the specified notification
 * workflow. It ensures uniqueness by idempotency key per workflow. If a
 * TriggerInstance with the same workflowId and idempotencyKey already exists,
 * it returns the existing instance.
 *
 * The newly created TriggerInstance is initialized with default status
 * 'enqueued', attempts count zero, available immediately, and cursor pointing
 * to the workflow's entry node.
 *
 * @param props - Object containing the authenticated systemAdmin and creation
 *   data
 * @param props.systemAdmin - The authenticated system administrator initiating
 *   the trigger
 * @param props.body - The TriggerInstance creation data including workflowId,
 *   idempotencyKey, and payload
 * @returns The existing or newly created TriggerInstance details
 * @throws {Error} Throws if the specified workflow does not exist
 */
export async function postnotificationWorkflowSystemAdminTriggerInstances(props: {
  systemAdmin: SystemAdminPayload;
  body: INotificationWorkflowTriggerInstance.ICreate;
}): Promise<INotificationWorkflowTriggerInstance> {
  const { systemAdmin, body } = props;

  // Check if a TriggerInstance with same workflow_id and idempotency_key exists
  const existing =
    await MyGlobal.prisma.notification_workflow_trigger_instances.findFirst({
      where: {
        workflow_id: body.workflow_id,
        idempotency_key: body.idempotency_key,
      },
    });

  if (existing) {
    return {
      id: existing.id,
      workflow_id: existing.workflow_id,
      idempotency_key: existing.idempotency_key,
      cursor_current_node_id: existing.cursor_current_node_id ?? null,
      status: existing.status,
      attempts: existing.attempts,
      available_at: existing.available_at
        ? toISOStringSafe(existing.available_at)
        : "",
      payload: existing.payload,
      created_at: existing.created_at
        ? toISOStringSafe(existing.created_at)
        : "",
      updated_at: existing.updated_at
        ? toISOStringSafe(existing.updated_at)
        : "",
    };
  }

  // Fetch workflow to get entry_node_id
  const workflow =
    await MyGlobal.prisma.notification_workflow_workflows.findUniqueOrThrow({
      where: { id: body.workflow_id },
    });

  const now = toISOStringSafe(new Date());
  const newId = v4();

  const created =
    await MyGlobal.prisma.notification_workflow_trigger_instances.create({
      data: {
        id: newId,
        workflow_id: body.workflow_id,
        idempotency_key: body.idempotency_key,
        cursor_current_node_id: workflow.entry_node_id,
        status: "enqueued",
        attempts: 0,
        available_at: now,
        payload: body.payload,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    workflow_id: created.workflow_id,
    idempotency_key: created.idempotency_key,
    cursor_current_node_id: created.cursor_current_node_id ?? null,
    status: created.status,
    attempts: created.attempts,
    available_at: toISOStringSafe(created.available_at),
    payload: created.payload,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
