import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationTemplate";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Retrieve full detail for a specific notification template by its UUID.
 *
 * This operation fetches a notification template for HR recruiters or
 * administrators to support UI display, template auditing, preview/edit action,
 * and impact assessment. Returns every non-sensitive field from the template,
 * or throws if not found/archived.
 *
 * @param props - Parameter object
 *
 *   - HrRecruiter: Authenticated HR recruiter making the request
 *   - TemplateId: UUID of the notification template to fetch
 *
 * @returns The requested notification template's full detail (per
 *   IAtsRecruitmentNotificationTemplate)
 * @throws {Error} When the template is not found or has been deleted/archived
 */
export async function getatsRecruitmentHrRecruiterNotificationTemplatesTemplateId(props: {
  hrRecruiter: HrrecruiterPayload;
  templateId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentNotificationTemplate> {
  const found =
    await MyGlobal.prisma.ats_recruitment_notification_templates.findFirst({
      where: {
        id: props.templateId,
        deleted_at: null,
      },
      select: {
        id: true,
        template_code: true,
        channel: true,
        title: true,
        subject: true,
        body: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!found) {
    throw new Error("Notification template not found");
  }
  return {
    id: found.id,
    template_code: found.template_code,
    channel: found.channel,
    title: found.title,
    subject:
      found.subject !== undefined && found.subject !== null
        ? found.subject
        : undefined,
    body: found.body,
    is_active: found.is_active,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at:
      found.deleted_at !== undefined && found.deleted_at !== null
        ? toISOStringSafe(found.deleted_at)
        : undefined,
  };
}
