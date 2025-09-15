import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Retrieves detailed information of a specific workflow node within a workflow.
 *
 * This endpoint fetches a workflow node by its node ID and validates it belongs
 * to the given workflow ID. Only system administrators have authorization to
 * perform this action.
 *
 * @param props - An object containing the authenticated systemAdmin,
 *   workflowId, and workflowNodeId.
 * @param props.systemAdmin - The authenticated system administrator.
 * @param props.workflowId - The UUID of the parent workflow.
 * @param props.workflowNodeId - The UUID of the target workflow node.
 * @returns A detailed workflow node object conforming to
 *   INotificationWorkflowWorkflowNode.
 * @throws {Error} Throws an error if the node is not found or does not belong
 *   to the workflow.
 */
export async function getnotificationWorkflowSystemAdminWorkflowsWorkflowIdWorkflowNodesWorkflowNodeId(props: {
  systemAdmin: SystemAdminPayload;
  workflowId: string & tags.Format<"uuid">;
  workflowNodeId: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowWorkflowNode> {
  const { systemAdmin, workflowId, workflowNodeId } = props;

  const node =
    await MyGlobal.prisma.notification_workflow_workflow_nodes.findFirstOrThrow(
      {
        where: {
          id: workflowNodeId,
          workflow_id: workflowId,
          deleted_at: null,
        },
      },
    );

  return {
    id: node.id,
    workflow_id: node.workflow_id,
    node_type: node.node_type,
    name: node.name,
    email_to_template: node.email_to_template ?? undefined,
    email_subject_template: node.email_subject_template ?? undefined,
    email_body_template: node.email_body_template ?? undefined,
    sms_to_template: node.sms_to_template ?? undefined,
    sms_body_template: node.sms_body_template ?? undefined,
    delay_ms: node.delay_ms ?? undefined,
    delay_duration: node.delay_duration ?? undefined,
    created_at: toISOStringSafe(node.created_at),
    updated_at: toISOStringSafe(node.updated_at),
    deleted_at: node.deleted_at ? toISOStringSafe(node.deleted_at) : undefined,
  };
}
