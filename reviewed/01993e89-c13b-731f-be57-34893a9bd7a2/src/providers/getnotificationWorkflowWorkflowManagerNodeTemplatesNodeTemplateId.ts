import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowNodeTemplate";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Retrieve notification node template details by ID
 *
 * Retrieves full details of a specific notification node template identified by
 * nodeTemplateId. Returns id, code, name, type (email, sms, delay), and
 * LiquidJS template body, along with creation and update timestamps in ISO 8601
 * format.
 *
 * @param props - Request properties including the authenticated workflow
 *   manager and nodeTemplateId
 * @param props.workflowManager - Authenticated workflow manager making the
 *   request
 * @param props.nodeTemplateId - Unique identifier of the node template
 * @returns The detailed notification workflow node template
 * @throws {Error} Throws if no node template exists with the provided ID
 */
export async function getnotificationWorkflowWorkflowManagerNodeTemplatesNodeTemplateId(props: {
  workflowManager: WorkflowmanagerPayload;
  nodeTemplateId: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowNodeTemplate> {
  const { workflowManager, nodeTemplateId } = props;

  const nodeTemplate =
    await MyGlobal.prisma.notification_workflow_node_templates.findUniqueOrThrow(
      {
        where: { id: nodeTemplateId },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          template_body: true,
          created_at: true,
          updated_at: true,
        },
      },
    );

  // Runtime validation for nodeTemplate.type
  typia.assertGuard<"email" | "sms" | "delay">(nodeTemplate.type);

  return {
    id: nodeTemplate.id,
    code: nodeTemplate.code,
    name: nodeTemplate.name,
    type: nodeTemplate.type,
    template_body: nodeTemplate.template_body,
    created_at: toISOStringSafe(nodeTemplate.created_at),
    updated_at: toISOStringSafe(nodeTemplate.updated_at),
  };
}
