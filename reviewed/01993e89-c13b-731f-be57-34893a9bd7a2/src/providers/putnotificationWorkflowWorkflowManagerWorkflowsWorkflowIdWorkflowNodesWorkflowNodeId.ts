import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Update a specific Workflow Node within a Workflow.
 *
 * Allows authorized workflow managers to update node properties such as
 * templates, delay values, and metadata. Ensures the node belongs to the
 * specified workflow.
 *
 * @param props - Object containing authenticated user, workflow and node IDs,
 *   and update details
 * @param props.workflowManager - Authenticated workflow manager with permission
 * @param props.workflowId - UUID of the workflow to which the node belongs
 * @param props.workflowNodeId - UUID of the workflow node to update
 * @param props.body - Partial update data for the workflow node
 * @returns Updated workflow node entity reflecting applied changes
 * @throws {Error} If the specified workflow node does not exist within the
 *   workflow
 */
export async function putnotificationWorkflowWorkflowManagerWorkflowsWorkflowIdWorkflowNodesWorkflowNodeId(props: {
  workflowManager: WorkflowmanagerPayload;
  workflowId: string & tags.Format<"uuid">;
  workflowNodeId: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflowNode.IUpdate;
}): Promise<INotificationWorkflowWorkflowNode> {
  const { workflowManager, workflowId, workflowNodeId, body } = props;

  const node =
    await MyGlobal.prisma.notification_workflow_workflow_nodes.findFirst({
      where: {
        id: workflowNodeId,
        workflow_id: workflowId,
      },
    });

  if (!node) throw new Error("Workflow node not found");

  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  const updated =
    await MyGlobal.prisma.notification_workflow_workflow_nodes.update({
      where: { id: workflowNodeId },
      data: {
        workflow_id: body.workflow_id ?? undefined,
        node_type: body.node_type ?? undefined,
        name: body.name ?? undefined,
        email_to_template:
          body.email_to_template === null
            ? null
            : (body.email_to_template ?? undefined),
        email_subject_template:
          body.email_subject_template === null
            ? null
            : (body.email_subject_template ?? undefined),
        email_body_template:
          body.email_body_template === null
            ? null
            : (body.email_body_template ?? undefined),
        sms_to_template:
          body.sms_to_template === null
            ? null
            : (body.sms_to_template ?? undefined),
        sms_body_template:
          body.sms_body_template === null
            ? null
            : (body.sms_body_template ?? undefined),
        delay_ms: body.delay_ms === null ? null : (body.delay_ms ?? undefined),
        delay_duration:
          body.delay_duration === null
            ? null
            : (body.delay_duration ?? undefined),
        deleted_at:
          body.deleted_at === null ? null : (body.deleted_at ?? undefined),
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    workflow_id: updated.workflow_id,
    node_type: updated.node_type,
    name: updated.name,
    email_to_template: updated.email_to_template ?? null,
    email_subject_template: updated.email_subject_template ?? null,
    email_body_template: updated.email_body_template ?? null,
    sms_to_template: updated.sms_to_template ?? null,
    sms_body_template: updated.sms_body_template ?? null,
    delay_ms: updated.delay_ms ?? null,
    delay_duration: updated.delay_duration ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
