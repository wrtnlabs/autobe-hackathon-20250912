import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationTemplate";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a notification template (ats_recruitment_notification_templates) by
 * templateId.
 *
 * This endpoint allows system administrators to update an existing notification
 * template's code, channel, subject, body, and active status. The operation
 * validates uniqueness of the (template_code, channel) pair and ensures updates
 * are only allowed on active (not deleted) templates. All changes are tracked
 * by automatic timestamps for audit compliance. Only partial fields supplied in
 * the update body will be modified; other fields are preserved.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the update
 * @param props.templateId - Unique identifier of the notification template to
 *   update
 * @param props.body - Object describing updated fields (code, channel, title,
 *   subject, body, is_active)
 * @returns The updated notification template normalized for API usage
 * @throws {Error} When template is not found, deleted, or if uniqueness
 *   constraints are violated
 */
export async function putatsRecruitmentSystemAdminNotificationTemplatesTemplateId(props: {
  systemAdmin: SystemadminPayload;
  templateId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentNotificationTemplate.IUpdate;
}): Promise<IAtsRecruitmentNotificationTemplate> {
  const { templateId, body } = props;

  // 1. Fetch the target notification template (must exist and not be soft-deleted)
  const template =
    await MyGlobal.prisma.ats_recruitment_notification_templates.findFirst({
      where: { id: templateId, deleted_at: null },
    });
  if (!template)
    throw new Error("Notification template not found or has been deleted.");

  // 2. Build the data update object (partial update, only present fields)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updateData: {
    template_code?: string;
    channel?: string;
    title?: string;
    subject?: string | null;
    body?: string;
    is_active?: boolean;
    updated_at: string & tags.Format<"date-time">;
  } = {
    ...(body.template_code !== undefined
      ? { template_code: body.template_code }
      : {}),
    ...(body.channel !== undefined ? { channel: body.channel } : {}),
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.subject !== undefined ? { subject: body.subject } : {}),
    ...(body.body !== undefined ? { body: body.body } : {}),
    ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
    updated_at: now,
  };

  // 3. Validate at least one updatable field is provided
  const isUpdateEmpty =
    Object.keys(updateData).length === 1 && updateData.updated_at !== undefined;
  if (isUpdateEmpty)
    throw new Error("No updatable fields provided in the request body.");

  // 4. Attempt update, catching duplicate (template_code, channel) error
  let updated;
  try {
    updated =
      await MyGlobal.prisma.ats_recruitment_notification_templates.update({
        where: { id: templateId },
        data: updateData,
      });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error(
        "Duplicate (template_code, channel) combination. The specified code and channel already exist on another template.",
      );
    }
    throw err;
  }

  // 5. Map all required fields to DTO, converting dates to ISO strings
  return {
    id: updated.id,
    template_code: updated.template_code,
    channel: updated.channel,
    title: updated.title,
    subject: updated.subject,
    body: updated.body,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
