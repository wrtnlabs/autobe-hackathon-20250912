import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Retrieves detailed information of a workflow node by its node ID within a
 * workflow.
 *
 * This function fetches a single active workflow node (not soft-deleted)
 * matching the given workflowNodeId and workflowId from the database. It
 * converts all DateTime fields to ISO8601 strings as required.
 *
 * Authorization is assumed to be handled by presence of WorkflowmanagerPayload.
 *
 * @param props - Object containing workflowManager payload and identifiers.
 * @param props.workflowManager - Authenticated workflow manager information.
 * @param props.workflowId - UUID of the parent workflow.
 * @param props.workflowNodeId - UUID of the target workflow node.
 * @returns Promise resolving to the detailed workflow node object.
 * @throws {Error} Throws if the node does not exist.
 */
export async function getnotificationWorkflowWorkflowManagerWorkflowsWorkflowIdWorkflowNodesWorkflowNodeId(props: {
  workflowManager: WorkflowmanagerPayload;
  workflowId: string & tags.Format<"uuid">;
  workflowNodeId: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowWorkflowNode> {
  const node =
    await MyGlobal.prisma.notification_workflow_workflow_nodes.findFirstOrThrow(
      {
        where: {
          id: props.workflowNodeId,
          workflow_id: props.workflowId,
          deleted_at: null,
        },
      },
    );

  return {
    id: node.id,
    workflow_id: node.workflow_id,
    node_type: node.node_type,
    name: node.name,
    email_to_template:
      node.email_to_template === null ? undefined : node.email_to_template,
    email_subject_template:
      node.email_subject_template === null
        ? undefined
        : node.email_subject_template,
    email_body_template:
      node.email_body_template === null ? undefined : node.email_body_template,
    sms_to_template:
      node.sms_to_template === null ? undefined : node.sms_to_template,
    sms_body_template:
      node.sms_body_template === null ? undefined : node.sms_body_template,
    delay_ms: node.delay_ms === null ? undefined : node.delay_ms,
    delay_duration:
      node.delay_duration === null ? undefined : node.delay_duration,
    created_at: toISOStringSafe(node.created_at),
    updated_at: toISOStringSafe(node.updated_at),
    deleted_at: node.deleted_at ? toISOStringSafe(node.deleted_at) : undefined,
  };
}
