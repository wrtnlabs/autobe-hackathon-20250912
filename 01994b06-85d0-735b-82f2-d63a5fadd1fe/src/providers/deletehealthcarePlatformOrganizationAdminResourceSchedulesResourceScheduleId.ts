import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently delete a resource schedule by ID (hard delete).
 *
 * This operation removes a resource schedule from the database by id, including
 * all recurrence and window information. Only organization admins assigned to
 * the resource schedule's organization can perform this action. Deletion is
 * permanent and cannot be undone.
 *
 * An audit log is created recording who performed the action.
 *
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the deletion.
 * @param props.resourceScheduleId - The UUID of the resource schedule to
 *   delete.
 * @returns Void
 * @throws {Error} If resource schedule not found
 * @throws {Error} If organization admin is not authorized for this resource
 *   schedule's organization
 */
export async function deletehealthcarePlatformOrganizationAdminResourceSchedulesResourceScheduleId(props: {
  organizationAdmin: OrganizationadminPayload;
  resourceScheduleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, resourceScheduleId } = props;

  // Find the schedule (must exist)
  const schedule =
    await MyGlobal.prisma.healthcare_platform_resource_schedules.findFirst({
      where: { id: resourceScheduleId },
    });
  if (schedule == null) {
    throw new Error("Resource schedule not found");
  }

  // Check organization admin assignment (authorization)
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id:
          schedule.healthcare_platform_organization_id,
        assignment_status: "active",
        deleted_at: null,
      },
    });
  if (assignment == null) {
    throw new Error("Not authorized to delete schedules for this organization");
  }

  // Hard delete the resource schedule
  await MyGlobal.prisma.healthcare_platform_resource_schedules.delete({
    where: { id: resourceScheduleId },
  });

  // Log audit event
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: organizationAdmin.id,
      organization_id: schedule.healthcare_platform_organization_id,
      action_type: "RESOURCE_SCHEDULE_DELETE",
      event_context: JSON.stringify({
        deleted_resource_schedule_id: resourceScheduleId,
      }),
      related_entity_type: "resource_schedule",
      related_entity_id: resourceScheduleId,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Operation complete
  return;
}
