import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import { TriggerOperatorPayload } from "../decorators/payload/TriggerOperatorPayload";

/**
 * Create a new TriggerInstance with idempotency enforcement
 *
 * This operation creates a TriggerInstance in the
 * notification_workflow_trigger_instances table. It ensures uniqueness on
 * (workflow_id, idempotency_key) by returning an existing trigger instance if
 * one is found, or creating a new one initialized with proper default values
 * for status, cursor, attempts, and availability timestamp.
 *
 * Authorization is restricted to triggerOperator roles, and the triggerOperator
 * param is used solely for access control assurance.
 *
 * @param props - Object containing authenticated triggerOperator and request
 *   body
 * @param props.triggerOperator - The authenticated trigger operator payload
 * @param props.body - The request body to create the trigger instance
 * @returns The existing or newly created trigger instance details
 * @throws {Error} If the workflow with the given workflow_id does not exist
 */
export async function postnotificationWorkflowTriggerOperatorTriggerInstances(props: {
  triggerOperator: TriggerOperatorPayload;
  body: INotificationWorkflowTriggerInstance.ICreate;
}): Promise<INotificationWorkflowTriggerInstance> {
  const { triggerOperator, body } = props;

  // Attempt to find existing trigger instance matching workflow_id and idempotency_key
  const existing =
    await MyGlobal.prisma.notification_workflow_trigger_instances.findFirst({
      where: {
        workflow_id: body.workflow_id,
        idempotency_key: body.idempotency_key,
      },
    });

  if (existing !== null) {
    return {
      id: existing.id,
      workflow_id: existing.workflow_id,
      idempotency_key: existing.idempotency_key,
      cursor_current_node_id: existing.cursor_current_node_id ?? undefined,
      status: existing.status,
      attempts: existing.attempts,
      available_at: toISOStringSafe(existing.available_at),
      payload: existing.payload,
      created_at: toISOStringSafe(existing.created_at),
      updated_at: toISOStringSafe(existing.updated_at),
    };
  }

  // Fetch the workflow to obtain entry_node_id for cursor initialization
  const workflow =
    await MyGlobal.prisma.notification_workflow_workflows.findUniqueOrThrow({
      where: { id: body.workflow_id },
      select: { entry_node_id: true },
    });

  const now = toISOStringSafe(new Date());

  // Create new trigger instance with initialization values
  const created =
    await MyGlobal.prisma.notification_workflow_trigger_instances.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
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
    cursor_current_node_id: created.cursor_current_node_id ?? undefined,
    status: created.status,
    attempts: created.attempts,
    available_at: toISOStringSafe(created.available_at),
    payload: created.payload,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
