import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowNodeTemplate";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Update a notification workflow node template by its unique identifier.
 *
 * This operation allows system administrators to modify node templates used in
 * notification workflows. It validates the existence of the template, checks
 * for unique code constraints, and updates all relevant fields.
 *
 * @param props - Object containing systemAdmin payload, nodeTemplateId, and
 *   update body
 * @returns The updated notification workflow node template object
 * @throws {Error} If the node template does not exist or code duplicate exists
 */
export async function putnotificationWorkflowSystemAdminNodeTemplatesNodeTemplateId(props: {
  systemAdmin: SystemAdminPayload;
  nodeTemplateId: string & tags.Format<"uuid">;
  body: INotificationWorkflowNodeTemplate.IUpdate;
}): Promise<INotificationWorkflowNodeTemplate> {
  const { systemAdmin, nodeTemplateId, body } = props;

  // Fetch existing template or throw if not found
  const existing =
    await MyGlobal.prisma.notification_workflow_node_templates.findUniqueOrThrow(
      {
        where: { id: nodeTemplateId },
      },
    );

  // Validate unique code constraint
  if (
    body.code !== undefined &&
    body.code !== null &&
    body.code !== existing.code
  ) {
    const conflict =
      await MyGlobal.prisma.notification_workflow_node_templates.findFirst({
        where: { code: body.code, id: { not: nodeTemplateId } },
      });
    if (conflict !== null)
      throw new Error(
        `Duplicate code '${body.code}' exists in other templates.`,
      );
  }

  // Current timestamp
  const now = toISOStringSafe(new Date());

  // Update the record
  const updated =
    await MyGlobal.prisma.notification_workflow_node_templates.update({
      where: { id: nodeTemplateId },
      data: {
        ...(body.code !== undefined && body.code !== null
          ? { code: body.code }
          : {}),
        ...(body.name !== undefined && body.name !== null
          ? { name: body.name }
          : {}),
        ...(body.type !== undefined && body.type !== null
          ? { type: body.type }
          : {}),
        ...(body.template_body !== undefined && body.template_body !== null
          ? { template_body: body.template_body }
          : {}),
        updated_at: now,
      },
    });

  // Build and return response object
  return {
    id: updated.id as string & tags.Format<"uuid">,
    code: updated.code,
    name: updated.name,
    type: updated.type as "email" | "sms" | "delay",
    template_body: updated.template_body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
