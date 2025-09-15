import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Create a new notification workflow node under a specified workflow.
 *
 * Creates a workflow node with specified type and templates or delay settings.
 * Links the node to the parent workflow by workflowId.
 *
 * Requires authorization as workflowManager.
 *
 * @param props - An object containing:
 *
 *   - WorkflowManager: Authenticated workflow manager payload.
 *   - WorkflowId: UUID of the parent workflow.
 *   - Body: Data to create the workflow node.
 *
 * @returns The detailed created workflow node object.
 * @throws {Error} Throws if creation fails or authorization is invalid.
 */
export async function postnotificationWorkflowWorkflowManagerWorkflowsWorkflowIdWorkflowNodes(props: {
  workflowManager: WorkflowmanagerPayload;
  workflowId: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflowNode.ICreate;
}): Promise<INotificationWorkflowWorkflowNode> {
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const data = {
    id,
    workflow_id: props.workflowId,
    node_type: props.body.node_type,
    name: props.body.name,
    email_to_template:
      props.body.email_to_template === undefined
        ? null
        : props.body.email_to_template,
    email_subject_template:
      props.body.email_subject_template === undefined
        ? null
        : props.body.email_subject_template,
    email_body_template:
      props.body.email_body_template === undefined
        ? null
        : props.body.email_body_template,
    sms_to_template:
      props.body.sms_to_template === undefined
        ? null
        : props.body.sms_to_template,
    sms_body_template:
      props.body.sms_body_template === undefined
        ? null
        : props.body.sms_body_template,
    delay_ms: props.body.delay_ms === undefined ? null : props.body.delay_ms,
    delay_duration:
      props.body.delay_duration === undefined
        ? null
        : props.body.delay_duration,
    created_at: now,
    updated_at: now,
  };

  const created =
    await MyGlobal.prisma.notification_workflow_workflow_nodes.create({ data });

  return {
    id: created.id,
    workflow_id: created.workflow_id,
    node_type: created.node_type,
    name: created.name,
    email_to_template: created.email_to_template,
    email_subject_template: created.email_subject_template,
    email_body_template: created.email_body_template,
    sms_to_template: created.sms_to_template,
    sms_body_template: created.sms_body_template,
    delay_ms: created.delay_ms,
    delay_duration: created.delay_duration,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
