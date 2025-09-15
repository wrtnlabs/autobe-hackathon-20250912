import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowNodeTemplate";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Retrieve notification node template details by ID.
 *
 * This operation fetches the detailed information of a notification workflow
 * node template identified by its unique nodeTemplateId. It returns all fields
 * including the code, name, type ("email", "sms", or "delay"), and the template
 * body content.
 *
 * Access is restricted to authenticated system administrators via systemAdmin
 * payload.
 *
 * @param props - Object containing the systemAdmin authentication and
 *   nodeTemplateId parameter
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.nodeTemplateId - The UUID identifier of the notification node
 *   template to retrieve
 * @returns The full details of the notification node template conforming to
 *   INotificationWorkflowNodeTemplate
 * @throws {Error} Throws if no notification node template with the given ID
 *   exists
 */
export async function getnotificationWorkflowSystemAdminNodeTemplatesNodeTemplateId(props: {
  systemAdmin: SystemAdminPayload;
  nodeTemplateId: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowNodeTemplate> {
  const { nodeTemplateId } = props;
  const record =
    await MyGlobal.prisma.notification_workflow_node_templates.findUniqueOrThrow(
      {
        where: { id: nodeTemplateId },
      },
    );

  return {
    id: record.id,
    code: record.code,
    name: record.name,
    type: record.type,
    template_body: record.template_body,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
