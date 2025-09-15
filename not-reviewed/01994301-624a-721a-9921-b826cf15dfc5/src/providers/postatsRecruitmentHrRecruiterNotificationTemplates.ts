import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationTemplate";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Create a new notification template (ats_recruitment_notification_templates).
 *
 * This operation creates and registers a new notification template used across
 * the ATS recruitment system for delivering notifications to users and system
 * actors. HR recruiters are required to authenticate, and template uniqueness
 * is enforced on the (template_code, channel) pair. All required fields
 * (template_code, channel, title, body, is_active) are validated and the
 * channel must be one of: email, sms, app_push, webhook. The system generates
 * the UUID and timestamps. If a duplicate conflict occurs, an error is thrown.
 *
 * @param props - Properties for creating a notification template
 * @param props.hrRecruiter - The authenticated HR recruiter creating the
 *   template
 * @param props.body - The creation payload including template_code, channel,
 *   title, subject (optional), body, and is_active
 * @returns The newly created notification template entity, with all metadata
 *   fields
 * @throws {Error} When channel is invalid or if (template_code, channel)
 *   already exists
 */
export async function postatsRecruitmentHrRecruiterNotificationTemplates(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentNotificationTemplate.ICreate;
}): Promise<IAtsRecruitmentNotificationTemplate> {
  const allowedChannels = ["email", "sms", "app_push", "webhook"];
  if (!allowedChannels.includes(props.body.channel)) {
    throw new Error("Invalid notification channel: " + props.body.channel);
  }

  // Enforce uniqueness of (template_code, channel)
  const duplicate =
    await MyGlobal.prisma.ats_recruitment_notification_templates.findFirst({
      where: {
        template_code: props.body.template_code,
        channel: props.body.channel,
      },
    });
  if (duplicate) {
    throw new Error(
      "A notification template with this template_code and channel already exists",
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.ats_recruitment_notification_templates.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        template_code: props.body.template_code,
        channel: props.body.channel,
        title: props.body.title,
        subject: props.body.subject ?? undefined,
        body: props.body.body,
        is_active: props.body.is_active,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    template_code: created.template_code,
    channel: created.channel,
    title: created.title,
    subject: created.subject ?? undefined,
    body: created.body,
    is_active: created.is_active,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
