import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Retrieve detailed information of a notification workflow by its ID.
 *
 * This function fetches the workflow including all related nodes and edges,
 * converting all DateTime fields to ISO 8601 strings. The deleted_at fields are
 * handled as nullable per API contract.
 *
 * @param props - Object containing the authenticated workflowManager payload
 *   and workflow ID
 * @returns The detailed notification workflow including nodes and edges
 * @throws {Error} Throws if no workflow with the specified ID is found
 */
export async function getnotificationWorkflowWorkflowManagerWorkflowsWorkflowId(props: {
  workflowManager: WorkflowmanagerPayload;
  workflowId: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowWorkflow> {
  const { workflowId } = props;

  const workflow =
    await MyGlobal.prisma.notification_workflow_workflows.findUniqueOrThrow({
      where: { id: workflowId },
      include: {
        notification_workflow_workflow_nodes: true,
        notification_workflow_workflow_edges: true,
      },
    });

  return {
    id: workflow.id,
    code: workflow.code,
    name: workflow.name,
    is_active: workflow.is_active,
    entry_node_id: workflow.entry_node_id,
    version: workflow.version,
    created_at: toISOStringSafe(workflow.created_at),
    updated_at: toISOStringSafe(workflow.updated_at),
    deleted_at: workflow.deleted_at
      ? toISOStringSafe(workflow.deleted_at)
      : null,

    notification_workflow_workflow_nodes:
      workflow.notification_workflow_workflow_nodes.map((node) => ({
        id: node.id,
        workflow_id: node.workflow_id,
        node_type: node.node_type,
        name: node.name,
        email_to_template: node.email_to_template ?? null,
        email_subject_template: node.email_subject_template ?? null,
        email_body_template: node.email_body_template ?? null,
        sms_to_template: node.sms_to_template ?? null,
        sms_body_template: node.sms_body_template ?? null,
        delay_ms: node.delay_ms ?? null,
        delay_duration: node.delay_duration ?? null,
        created_at: toISOStringSafe(node.created_at),
        updated_at: toISOStringSafe(node.updated_at),
        deleted_at: node.deleted_at ? toISOStringSafe(node.deleted_at) : null,
      })),

    notification_workflow_workflow_edges:
      workflow.notification_workflow_workflow_edges.map((edge) => ({
        id: edge.id,
        workflow_id: edge.workflow_id,
        from_node_id: edge.from_node_id,
        to_node_id: edge.to_node_id,
        created_at: toISOStringSafe(edge.created_at),
        updated_at: toISOStringSafe(edge.updated_at),
        deleted_at: edge.deleted_at ? toISOStringSafe(edge.deleted_at) : null,
      })),
  };
}
