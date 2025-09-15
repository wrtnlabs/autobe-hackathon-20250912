import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowNodeTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowNodeTemplate";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Create a new notification workflow node template.
 *
 * This function allows a system administrator to add a reusable node template
 * for notification workflows. Each node template includes LiquidJS template
 * content which can be used in email, sms, or delay notification nodes.
 *
 * The template 'code' must be unique. The 'id' is generated as a new UUID. The
 * timestamps are recorded as the current time in UTC ISO string format.
 *
 * @param props - The function parameters containing the authenticated system
 *   admin and request body.
 * @param props.systemAdmin - The authenticated system admin making the request.
 * @param props.body - The data required to create the node template.
 * @returns The newly created notification workflow node template.
 * @throws {Error} If the Prisma create operation fails (e.g., due to unique
 *   constraint violation).
 */
export async function postnotificationWorkflowSystemAdminNodeTemplates(props: {
  systemAdmin: SystemAdminPayload;
  body: INotificationWorkflowNodeTemplate.ICreate;
}): Promise<INotificationWorkflowNodeTemplate> {
  const { systemAdmin, body } = props;

  // Generate new UUID for the node template ID
  const id = v4() as string & tags.Format<"uuid">;

  // Get current ISO timestamp for created_at and updated_at
  const now = toISOStringSafe(new Date());

  // Create the node template record in the database
  const created =
    await MyGlobal.prisma.notification_workflow_node_templates.create({
      data: {
        id,
        code: body.code,
        name: body.name,
        type: body.type,
        template_body: body.template_body,
        created_at: now,
        updated_at: now,
      },
    });

  // Ensure type matches exact literals (without using 'as') using local variable with type assertion
  // But since 'created.type' is string, and DTO expects the union type, assign explicitly
  const typeLiteral: "email" | "sms" | "delay" = created.type as
    | "email"
    | "sms"
    | "delay";

  // Return the created node template with proper brands and types
  return {
    id: created.id,
    code: created.code,
    name: created.name,
    type: typeLiteral,
    template_body: created.template_body,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
  };
}
