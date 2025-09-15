import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve details for a single resource schedule in
 * healthcare_platform_resource_schedules table.
 *
 * Permits privileged organization administrators to view a specific resource
 * schedule's details, strictly scoped to their own organization. Returns all
 * resource schedule configuration fields suitable for administrative panels,
 * auditing, and advanced scheduling logic.
 *
 * If the schedule entry does not exist, is soft-deleted, or the admin is not
 * authorized, an error is thrown.
 *
 * @param props - Parameters for the resource schedule query
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request (OrganizationadminPayload)
 * @param props.resourceScheduleId - Unique UUID identifier of the resource
 *   schedule to fetch
 * @returns Full configuration entry for the requested resource schedule,
 *   including all schedule fields
 * @throws {Error} If record is not found, soft-deleted, or is inaccessible by
 *   organization
 */
export async function gethealthcarePlatformOrganizationAdminResourceSchedulesResourceScheduleId(props: {
  organizationAdmin: OrganizationadminPayload;
  resourceScheduleId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformResourceSchedule> {
  const { organizationAdmin, resourceScheduleId } = props;
  const schedule =
    await MyGlobal.prisma.healthcare_platform_resource_schedules.findFirst({
      where: {
        id: resourceScheduleId,
        deleted_at: null,
        healthcare_platform_organization_id: organizationAdmin.id,
      },
    });
  if (!schedule) {
    throw new Error(
      "Resource schedule not found or you do not have permission to access it.",
    );
  }
  return {
    id: schedule.id,
    healthcare_platform_organization_id:
      schedule.healthcare_platform_organization_id,
    resource_type: schedule.resource_type,
    resource_id: schedule.resource_id,
    available_start_time: schedule.available_start_time,
    available_end_time: schedule.available_end_time,
    recurrence_pattern: schedule.recurrence_pattern ?? undefined,
    exception_dates: schedule.exception_dates ?? undefined,
    created_at: toISOStringSafe(schedule.created_at),
    updated_at: toISOStringSafe(schedule.updated_at),
    deleted_at: schedule.deleted_at
      ? toISOStringSafe(schedule.deleted_at)
      : undefined,
  };
}
