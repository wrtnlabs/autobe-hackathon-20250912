import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft-delete a notification template (ats_recruitment_notification_templates)
 * by templateId.
 *
 * This operation marks the specified notification template as deleted by
 * setting its 'deleted_at' timestamp to the current time. The soft deletion
 * ensures the template is preserved for audit and rollback purposes, removing
 * it from eligibility for new notifications but maintaining compliance with
 * data retention policies.
 *
 * Only system administrators are authorized to perform this operation. Each
 * successful delete action is recorded in the ats_recruitment_audit_trails
 * table for full compliance, including operator, timestamp, and contextual
 * details.
 *
 * The operation is idempotent: if the template is already deleted, the call is
 * silently ignored. Errors are thrown only for non-existent templates.
 *
 * @param props - Properties for this operation
 * @param props.systemAdmin - Authenticated SystemadminPayload performing the
 *   action
 * @param props.templateId - UUID of the notification template to delete
 * @returns Void
 * @throws {Error} If the templateId does not correspond to any notification
 *   template
 */
export async function deleteatsRecruitmentSystemAdminNotificationTemplatesTemplateId(props: {
  systemAdmin: SystemadminPayload;
  templateId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, templateId } = props;
  // Fetch template by id
  const template =
    await MyGlobal.prisma.ats_recruitment_notification_templates.findFirst({
      where: { id: templateId },
    });
  if (!template) {
    throw new Error("Notification template not found");
  }
  if (template.deleted_at !== null && template.deleted_at !== undefined) {
    // Already soft-deleted: idempotent, do nothing
    return;
  }
  const now = toISOStringSafe(new Date());
  // Perform soft-delete (set deleted_at)
  await MyGlobal.prisma.ats_recruitment_notification_templates.update({
    where: { id: templateId },
    data: { deleted_at: now },
  });
  // Write compliance audit log
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_timestamp: now,
      actor_id: systemAdmin.id,
      actor_role: "systemadmin",
      operation_type: "DELETE",
      target_type: "notification_template",
      target_id: templateId,
      event_detail: JSON.stringify({
        action: "soft-delete notification_template",
        templateId,
      }),
      ip_address: undefined,
      user_agent: undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
