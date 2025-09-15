import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationTemplate";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new notification template for the ATS recruitment notification
 * system.
 *
 * This operation allows a system administrator to register a new notification
 * template for email, SMS, app push, or webhook delivery. The admin supplies a
 * unique template code, the desired channel, the template title, subject
 * (required for email), body content, and active status. The system enforces
 * code/channel uniqueness, ensures all required fields are present, and returns
 * the full detail of the created template upon success.
 *
 * Authorization: Only users with systemAdmin privileges may create notification
 * templates. All requests are subject to permission checks.
 *
 * @param props - Object containing the authenticated systemAdmin and request
 *   body
 * @param props.systemAdmin - The authenticated system administrator creating
 *   the template
 * @param props.body - The new notification template configuration details
 * @returns The newly created notification template entity with all fields
 *   populated
 * @throws {Error} When required fields are missing
 * @throws {Error} When subject is missing for channel "email"
 * @throws {Error} If a template with the same code+channel already exists
 */
export async function postatsRecruitmentSystemAdminNotificationTemplates(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentNotificationTemplate.ICreate;
}): Promise<IAtsRecruitmentNotificationTemplate> {
  const { body } = props;

  // Validate required fields
  if (
    typeof body.template_code !== "string" ||
    body.template_code.trim() === ""
  ) {
    throw new Error("template_code is required");
  }
  if (typeof body.channel !== "string" || body.channel.trim() === "") {
    throw new Error("channel is required");
  }
  if (typeof body.title !== "string" || body.title.trim() === "") {
    throw new Error("title is required");
  }
  if (typeof body.body !== "string" || body.body.trim() === "") {
    throw new Error("body is required");
  }
  if (typeof body.is_active !== "boolean") {
    throw new Error("is_active is required");
  }
  if (
    body.channel === "email" &&
    (typeof body.subject !== "string" || body.subject.trim() === "")
  ) {
    throw new Error("subject is required for email channel");
  }

  // Uniqueness check on (template_code, channel)
  const existing =
    await MyGlobal.prisma.ats_recruitment_notification_templates.findFirst({
      where: {
        template_code: body.template_code,
        channel: body.channel,
      },
    });
  if (existing) {
    throw new Error("Notification template code must be unique per channel");
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.ats_recruitment_notification_templates.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        template_code: body.template_code,
        channel: body.channel,
        title: body.title,
        subject: body.subject ?? undefined,
        body: body.body,
        is_active: body.is_active,
        created_at: now,
        updated_at: now,
      },
    });

  // Output matches DTO, all dates as string & tags.Format<'date-time'>, no native Date anywhere
  return {
    id: created.id,
    template_code: created.template_code,
    channel: created.channel,
    title: created.title,
    subject: created.subject ?? undefined,
    body: created.body,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
