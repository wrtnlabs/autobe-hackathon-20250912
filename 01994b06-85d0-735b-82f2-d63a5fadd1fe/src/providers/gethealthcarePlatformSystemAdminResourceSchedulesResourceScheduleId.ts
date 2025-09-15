import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve details for a single resource schedule in
 * healthcare_platform_resource_schedules table.
 *
 * Permits privileged administrators to view detailed configuration of a
 * specific resource schedule entry, identified by resourceScheduleId (UUID).
 * Returns all configuration fields, suitable for display, resource auditing, or
 * scheduling logic.
 *
 * @param props - The properties including:
 *
 *   - SystemAdmin: The authenticated SystemadminPayload
 *   - ResourceScheduleId: Unique identifier for the resource schedule
 *
 * @returns The resource schedule configuration as
 *   IHealthcarePlatformResourceSchedule
 * @throws {Error} If the schedule does not exist or has been soft-deleted
 */
export async function gethealthcarePlatformSystemAdminResourceSchedulesResourceScheduleId(props: {
  systemAdmin: SystemadminPayload;
  resourceScheduleId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformResourceSchedule> {
  const { resourceScheduleId } = props;
  const schedule =
    await MyGlobal.prisma.healthcare_platform_resource_schedules.findFirst({
      where: {
        id: resourceScheduleId,
        deleted_at: null,
      },
    });
  if (!schedule) {
    throw new Error("Resource schedule not found");
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
    ...(schedule.deleted_at !== null && schedule.deleted_at !== undefined
      ? { deleted_at: toISOStringSafe(schedule.deleted_at) }
      : {}),
  };
}
