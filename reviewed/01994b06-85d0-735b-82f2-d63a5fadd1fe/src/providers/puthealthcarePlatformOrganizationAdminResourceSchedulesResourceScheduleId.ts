import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update resource schedule details (healthcare_platform_resource_schedules) by
 * ID
 *
 * Updates an existing resource schedule identified by resourceScheduleId,
 * allowing modification of the available start/end times, resource assignment,
 * recurrence pattern, and exceptions. This endpoint is critical for adapting
 * room/provider/equipment schedules as operational needs change.
 *
 * Only the owning organization's admin can update the schedule. This function
 * also enforces that updates will not create overlapping scheduled windows for
 * the same resource, and that all compliance and uniqueness constraints are
 * respected. Throws an error if violation is detected.
 *
 * All date and datetime values are typed as string & tags.Format<'date-time'>,
 * never Date.
 *
 * @param props - Request context with authenticated organizationAdmin, schedule
 *   id, and update body
 * @param props.organizationAdmin - Authenticated OrganizationadminPayload
 *   (authorization required)
 * @param props.resourceScheduleId - UUID of the resource schedule to update
 * @param props.body - IHealthcarePlatformResourceSchedule.IUpdate containing
 *   update fields
 * @returns The updated resource schedule, strictly typed, with all
 *   date/datetime fields as strings
 * @throws {Error} If schedule not found, forbidden (wrong org), or update would
 *   cause schedule overlap
 */
export async function puthealthcarePlatformOrganizationAdminResourceSchedulesResourceScheduleId(props: {
  organizationAdmin: OrganizationadminPayload;
  resourceScheduleId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformResourceSchedule.IUpdate;
}): Promise<IHealthcarePlatformResourceSchedule> {
  const { organizationAdmin, resourceScheduleId, body } = props;

  // Fetch schedule and enforce org admin ownership
  const schedule =
    await MyGlobal.prisma.healthcare_platform_resource_schedules.findFirst({
      where: {
        id: resourceScheduleId,
        deleted_at: null,
      },
    });
  if (!schedule) throw new Error("Resource schedule not found");
  if (schedule.healthcare_platform_organization_id !== organizationAdmin.id)
    throw new Error("Forbidden: not your organization");

  // Detect if updating any fields that may affect overlap
  const overlapSensitive =
    body.resource_id !== undefined ||
    body.available_start_time !== undefined ||
    body.available_end_time !== undefined ||
    body.recurrence_pattern !== undefined ||
    body.exception_dates !== undefined;

  if (overlapSensitive) {
    // Use intended future state for the overlap check
    const resource_id = body.resource_id ?? schedule.resource_id;
    const start = body.available_start_time ?? schedule.available_start_time;
    const end = body.available_end_time ?? schedule.available_end_time;

    // Overlap: same resource, same org, non-deleted, different id, windows overlap
    const overlap =
      await MyGlobal.prisma.healthcare_platform_resource_schedules.findFirst({
        where: {
          id: { not: schedule.id },
          healthcare_platform_organization_id:
            schedule.healthcare_platform_organization_id,
          resource_id: resource_id,
          deleted_at: null,
          OR: [
            {
              available_start_time: { lt: end },
              available_end_time: { gt: start },
            },
          ],
        },
      });
    if (overlap) {
      throw new Error("Schedule overlap detected for the resource");
    }
  }

  // Only pass provided fields and always update updated_at
  const now = toISOStringSafe(new Date());
  const updateFields: {
    resource_type?: string;
    resource_id?: string & tags.Format<"uuid">;
    available_start_time?: string;
    available_end_time?: string;
    recurrence_pattern?: string | null;
    exception_dates?: string | null;
    deleted_at?: (string & tags.Format<"date-time">) | null;
    updated_at: string & tags.Format<"date-time">;
  } = { updated_at: now };
  if (body.resource_type !== undefined)
    updateFields.resource_type = body.resource_type;
  if (body.resource_id !== undefined)
    updateFields.resource_id = body.resource_id;
  if (body.available_start_time !== undefined)
    updateFields.available_start_time = body.available_start_time;
  if (body.available_end_time !== undefined)
    updateFields.available_end_time = body.available_end_time;
  if (body.recurrence_pattern !== undefined)
    updateFields.recurrence_pattern = body.recurrence_pattern;
  if (body.exception_dates !== undefined)
    updateFields.exception_dates = body.exception_dates;
  if (body.deleted_at !== undefined) updateFields.deleted_at = body.deleted_at;

  const updated =
    await MyGlobal.prisma.healthcare_platform_resource_schedules.update({
      where: { id: resourceScheduleId },
      data: updateFields,
    });

  // Return with strict typing, converting datetime fields (never expose Date)
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    resource_type: updated.resource_type,
    resource_id: updated.resource_id,
    available_start_time: updated.available_start_time,
    available_end_time: updated.available_end_time,
    recurrence_pattern: updated.recurrence_pattern ?? undefined,
    exception_dates: updated.exception_dates ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
