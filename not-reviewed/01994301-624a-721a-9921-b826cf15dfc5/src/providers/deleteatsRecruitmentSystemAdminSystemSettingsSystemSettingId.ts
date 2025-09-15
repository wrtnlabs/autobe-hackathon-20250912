import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete (soft) a global ATS system setting by its unique identifier
 * (ats_recruitment_system_settings table).
 *
 * This endpoint marks a global system setting as deleted by setting its
 * deleted_at timestamp, as per audit/compliance requirements. Deletion requires
 * a super administrator (systemadmin) and is logged in the audit trails.
 * Attempting to delete a non-existent or already deleted setting results in an
 * error. All affected actions are auditable for future compliance and
 * forensics.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated super administrator requesting
 *   the deletion
 * @param props.systemSettingId - The unique UUID of the system setting to
 *   delete
 * @returns Void
 * @throws {Error} When the system administrator is not a super_admin, or if the
 *   target setting does not exist or was already deleted
 */
export async function deleteatsRecruitmentSystemAdminSystemSettingsSystemSettingId(props: {
  systemAdmin: SystemadminPayload;
  systemSettingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, systemSettingId } = props;

  // 1. Validate admin type and fetch current record to check super_admin access
  if (!systemAdmin || systemAdmin.type !== "systemadmin") {
    throw new Error("System administrator authentication failed");
  }

  const admin = await MyGlobal.prisma.ats_recruitment_systemadmins.findFirst({
    where: { id: systemAdmin.id, is_active: true, deleted_at: null },
  });
  if (!admin || admin.super_admin !== true) {
    throw new Error("Only super administrators can delete system settings");
  }

  // 2. Retrieve the system setting record, ensure exists and not already deleted
  const setting =
    await MyGlobal.prisma.ats_recruitment_system_settings.findFirst({
      where: { id: systemSettingId, deleted_at: null },
    });
  if (!setting) {
    throw new Error("System setting not found or already deleted");
  }

  // 3. Prepare timestamp for soft-delete and audit
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 4. Perform soft delete
  await MyGlobal.prisma.ats_recruitment_system_settings.update({
    where: { id: setting.id },
    data: { deleted_at: now },
  });

  // 5. Audit log entry
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_timestamp: now,
      actor_id: systemAdmin.id,
      actor_role: "systemadmin",
      operation_type: "DELETE",
      target_type: "system_setting",
      target_id: setting.id,
      event_detail: `System setting [${setting.setting_name}] deleted by admin [${systemAdmin.id}]`,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      ip_address: null,
      user_agent: null,
    },
  });
  // Return void
}
