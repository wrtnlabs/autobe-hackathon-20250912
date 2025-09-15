import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new appointment status code and configuration in the scheduling
 * system.
 *
 * This operation enables an authorized organization administrator or scheduling
 * staff to define a new appointment status for workflow logic. Each appointment
 * status must have a unique status_code (among all appointment statuses), a
 * display label, an optional workflow group (business_status), and a
 * business-priority sort_order. Duplicate status_codes or sort_orders are not
 * allowed.
 *
 * @param props - The input object
 * @param props.organizationAdmin - The authenticated organizationAdmin
 *   credentials (must be present)
 * @param props.body - Appointment status definition to create (status_code,
 *   display_name, business_status, sort_order)
 * @returns Full new appointment status definition as per API contract
 * @throws {Error} If status_code or sort_order is not unique, or if required
 *   fields missing
 */
export async function posthealthcarePlatformOrganizationAdminAppointmentStatuses(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformAppointmentStatus.ICreate;
}): Promise<IHealthcarePlatformAppointmentStatus> {
  // Business rule: status_code must be unique platform-wide
  const duplicateCode =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findFirst({
      where: { status_code: props.body.status_code },
      select: { id: true },
    });
  if (duplicateCode) {
    throw new Error(
      `Appointment status code '${props.body.status_code}' already exists. Codes must be unique.`,
    );
  }

  // Business rule: sort_order must not conflict with existing entry
  const duplicateOrder =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findFirst({
      where: { sort_order: props.body.sort_order },
      select: { id: true },
    });
  if (duplicateOrder) {
    throw new Error(
      `Appointment status sort_order '${props.body.sort_order}' is already assigned to another status. Each status must have a unique sort_order.`,
    );
  }

  // Insert new appointment status
  const result =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.create({
      data: {
        id: v4(),
        status_code: props.body.status_code,
        display_name: props.body.display_name,
        business_status:
          props.body.business_status !== undefined
            ? props.body.business_status
            : null,
        sort_order: props.body.sort_order,
      },
    });

  // Compose and return the new API object, matching required type (no casts)
  return {
    id: result.id,
    status_code: result.status_code,
    display_name: result.display_name,
    business_status:
      result.business_status !== undefined && result.business_status !== null
        ? result.business_status
        : null,
    sort_order: result.sort_order,
  };
}
