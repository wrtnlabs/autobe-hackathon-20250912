import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Creates a new notification workflow node under a specified workflow.
 *
 * This operation is authorized only for system administrators. It creates a
 * node with the specified type and optional LiquidJS templates or delay
 * parameters, linking it correctly to the parent workflow identified by
 * workflowId.
 *
 * @param props - Object containing systemAdmin auth, workflowId path param, and
 *   node creation body
 * @returns The created notification workflow node with detailed properties
 * @throws {Error} Throws if database operation fails or parameters are invalid
 */
export async function postnotificationWorkflowSystemAdminWorkflowsWorkflowIdWorkflowNodes(props: {
  systemAdmin: SystemAdminPayload;
  workflowId: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflowNode.ICreate;
}): Promise<INotificationWorkflowWorkflowNode> {
  const { systemAdmin, workflowId, body } = props;

  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.notification_workflow_workflow_nodes.create({
      data: {
        id: newId,
        workflow_id: body.workflow_id,
        node_type: body.node_type,
        name: body.name,
        email_to_template: body.email_to_template ?? undefined,
        email_subject_template: body.email_subject_template ?? undefined,
        email_body_template: body.email_body_template ?? undefined,
        sms_to_template: body.sms_to_template ?? undefined,
        sms_body_template: body.sms_body_template ?? undefined,
        delay_ms: body.delay_ms ?? undefined,
        delay_duration: body.delay_duration ?? undefined,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    workflow_id: created.workflow_id,
    node_type: created.node_type,
    name: created.name,
    email_to_template: created.email_to_template ?? undefined,
    email_subject_template: created.email_subject_template ?? undefined,
    email_body_template: created.email_body_template ?? undefined,
    sms_to_template: created.sms_to_template ?? undefined,
    sms_body_template: created.sms_body_template ?? undefined,
    delay_ms: created.delay_ms ?? undefined,
    delay_duration: created.delay_duration ?? undefined,
    created_at: now,
    updated_at: now,
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
