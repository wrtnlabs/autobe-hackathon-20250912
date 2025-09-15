import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationTemplate";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve details of a specific notification template
 * (ats_recruitment_notification_templates).
 *
 * Fetches the details of a single notification template in the recruitment
 * system by its templateId. This operation is used by HR recruiters and system
 * administrators to view in-depth configuration, including channel, title,
 * subject, template code, body, creation and update timestamps, and activation
 * status. If the templateId does not correspond to an existing record or is
 * deleted/archived, an error is thrown.
 *
 * @param props - Request parameters
 * @param props.systemAdmin - Authenticated system admin (authorization enforced
 *   by decorator)
 * @param props.templateId - UUID of the notification template to retrieve
 * @returns IAtsRecruitmentNotificationTemplate containing all template data
 *   fields
 * @throws {Error} If template does not exist for the given id
 */
export async function getatsRecruitmentSystemAdminNotificationTemplatesTemplateId(props: {
  systemAdmin: SystemadminPayload;
  templateId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentNotificationTemplate> {
  const { templateId } = props;
  const template =
    await MyGlobal.prisma.ats_recruitment_notification_templates.findUnique({
      where: { id: templateId },
    });
  if (!template) throw new Error("Notification template not found");
  return {
    id: template.id,
    template_code: template.template_code,
    channel: template.channel,
    title: template.title,
    subject: template.subject === null ? undefined : template.subject,
    body: template.body,
    is_active: template.is_active,
    created_at: toISOStringSafe(template.created_at),
    updated_at: toISOStringSafe(template.updated_at),
    deleted_at:
      template.deleted_at === null
        ? undefined
        : toISOStringSafe(template.deleted_at),
  };
}
