import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformResourceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformResourceSchedule";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new resource schedule for provider/room/equipment availability
 * (healthcare_platform_resource_schedules)
 *
 * This operation allows authorized organization admins to create a new resource
 * schedule defining provider, room, or equipment availability within their
 * organization. The function enforces that schedules do not overlap for the
 * same resource within the same organization, in compliance with business and
 * audit policies. It ensures correct compliance and auditability by returning
 * complete schedule information.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing this operation
 * @param props.body - The creation payload, specifying the resource, time
 *   window, and recurrence/exception pattern
 * @returns The fully populated resource schedule object
 * @throws {Error} When an overlapping schedule for the resource and
 *   availability window already exists
 */
export async function posthealthcarePlatformOrganizationAdminResourceSchedules(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformResourceSchedule.ICreate;
}): Promise<IHealthcarePlatformResourceSchedule> {
  const { organizationAdmin, body } = props;

  // Validate: No overlap for the same resource, organization, and (active) schedule
  const overlap =
    await MyGlobal.prisma.healthcare_platform_resource_schedules.findFirst({
      where: {
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        resource_id: body.resource_id,
        resource_type: body.resource_type,
        deleted_at: null,
        OR: [
          {
            available_start_time: { lte: body.available_end_time },
            available_end_time: { gte: body.available_start_time },
          },
        ],
      },
    });
  if (overlap) {
    throw new Error(
      "Overlapping resource schedule exists for this resource, type, and time window",
    );
  }
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_resource_schedules.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        resource_type: body.resource_type,
        resource_id: body.resource_id,
        available_start_time: body.available_start_time,
        available_end_time: body.available_end_time,
        recurrence_pattern: body.recurrence_pattern ?? null,
        exception_dates: body.exception_dates ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  return {
    id: created.id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id,
    resource_type: created.resource_type,
    resource_id: created.resource_id,
    available_start_time: created.available_start_time,
    available_end_time: created.available_end_time,
    recurrence_pattern: created.recurrence_pattern ?? undefined,
    exception_dates: created.exception_dates ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at == null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
