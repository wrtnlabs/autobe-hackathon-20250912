import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Update a specific Workflow Node within a Workflow
 *
 * This API operation enables authorized system administrators to update details
 * of a specific Workflow Node. It validates the existence of the workflow and
 * the node and ensures that the node belongs to the specified workflow. Updates
 * can include templates for email and SMS, delay settings, and metadata.
 *
 * @param props - Object containing systemAdmin auth, workflowId,
 *   workflowNodeId, and update body
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.workflowId - UUID of the workflow to which the node belongs
 * @param props.workflowNodeId - UUID of the node to update
 * @param props.body - Partial update details for the workflow node
 * @returns Updated workflow node object conforming to
 *   INotificationWorkflowWorkflowNode
 * @throws {Error} When the workflow or workflow node does not exist, or
 *   mismatched
 */
export async function putnotificationWorkflowSystemAdminWorkflowsWorkflowIdWorkflowNodesWorkflowNodeId(props: {
  systemAdmin: SystemAdminPayload;
  workflowId: string & tags.Format<"uuid">;
  workflowNodeId: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflowNode.IUpdate;
}): Promise<INotificationWorkflowWorkflowNode> {
  const { systemAdmin, workflowId, workflowNodeId, body } = props;

  // Verify workflow existence
  const workflow =
    await MyGlobal.prisma.notification_workflow_workflows.findUnique({
      where: { id: workflowId },
    });
  if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

  // Verify workflow node existence and relation to workflow
  const workflowNode =
    await MyGlobal.prisma.notification_workflow_workflow_nodes.findUnique({
      where: { id: workflowNodeId },
    });
  if (!workflowNode)
    throw new Error(`Workflow node not found: ${workflowNodeId}`);
  if (workflowNode.workflow_id !== workflowId) {
    throw new Error(
      `Workflow node ${workflowNodeId} does not belong to workflow ${workflowId}`,
    );
  }

  // Prepare update data
  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.notification_workflow_workflow_nodes.update({
      where: { id: workflowNodeId },
      data: {
        ...(body.workflow_id !== undefined && {
          workflow_id: body.workflow_id,
        }),
        ...(body.node_type !== undefined && { node_type: body.node_type }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.email_to_template !== undefined && {
          email_to_template: body.email_to_template,
        }),
        ...(body.email_subject_template !== undefined && {
          email_subject_template: body.email_subject_template,
        }),
        ...(body.email_body_template !== undefined && {
          email_body_template: body.email_body_template,
        }),
        ...(body.sms_to_template !== undefined && {
          sms_to_template: body.sms_to_template,
        }),
        ...(body.sms_body_template !== undefined && {
          sms_body_template: body.sms_body_template,
        }),
        ...(body.delay_ms !== undefined && { delay_ms: body.delay_ms }),
        ...(body.delay_duration !== undefined && {
          delay_duration: body.delay_duration,
        }),
        ...(body.deleted_at !== undefined && { deleted_at: body.deleted_at }),
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
