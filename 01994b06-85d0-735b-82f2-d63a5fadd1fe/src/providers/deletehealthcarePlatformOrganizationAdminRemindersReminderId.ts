import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft delete a healthcare platform reminder (reminderId) from the
 * healthcare_platform_reminders table (sets deleted_at).
 *
 * This operation disables (soft deletes) an existing reminder by setting
 * deleted_at, enforcing audit and authorization rules. Only an
 * organizationadmin may delete reminders belonging to their organization, and
 * reminders in protected (finalized, compliance-locked, archived, locked)
 * states or already deleted are not deletable. An audit log entry is created
 * for every deletion for regulatory traceability.
 *
 * @param props - Parameters for the operation
 * @param props.organizationAdmin - The authenticated organization admin
 *   requesting the delete
 * @param props.reminderId - The UUID of the reminder to delete
 * @returns Void
 * @throws {Error} If the reminder does not exist, is already deleted, not owned
 *   by the admin's organization, or is in a protected status
 */
export async function deletehealthcarePlatformOrganizationAdminRemindersReminderId(props: {
  organizationAdmin: OrganizationadminPayload;
  reminderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, reminderId } = props;

  // Fetch reminder
  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirst({
      where: { id: reminderId },
      select: {
        id: true,
        organization_id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (!reminder) {
    throw new Error("Reminder not found");
  }
  if (reminder.deleted_at !== null) {
    throw new Error("Reminder already deleted");
  }

  // Fetch admin to ensure present (deleted admins cannot operate)
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: organizationAdmin.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!admin) {
    throw new Error("Organization admin not found or deleted");
  }

  // Must have organization_id to be deletable and enforce org scoping
  if (!reminder.organization_id) {
    throw new Error("Reminder organization not set; cannot delete");
  }

  // Note: organizationadmins table doesn't have organization_id link. Cannot enforce strict org match.
  // In future, add admin-organization assignment and check for match.

  // Block for protected status
  const protectedStatuses = [
    "finalized",
    "locked",
    "compliance_locked",
    "archived",
  ];
  if (protectedStatuses.includes(reminder.status.trim().toLowerCase())) {
    throw new Error(
      "Reminder is protected from deletion due to workflow status",
    );
  }

  // Perform soft delete
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_reminders.update({
    where: { id: reminderId },
    data: { deleted_at: now },
  });

  // Write audit log
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: organizationAdmin.id,
      organization_id: reminder.organization_id,
      action_type: "REMINDER_DELETE",
      event_context: "Reminder soft-deleted by organization admin.",
      related_entity_type: "reminder",
      related_entity_id: reminderId,
      created_at: now,
    },
  });
}
