import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an appointment status in healthcare_platform_appointment_statuses
 * table.
 *
 * This operation allows an organization administrator to update details of an
 * appointment status, including display name, workflow/business grouping, and
 * sort order used in the healthcare platform's scheduling module. Only fields
 * allowed by schema (display_name, business_status, sort_order) may be
 * modified. Identification is by UUID ('statusId'), non-existent rows cause an
 * error. The API ensures compliance with strict field typing and functional
 * programming practices.
 *
 * Authorization is handled by the decorator and payload injection
 * (props.organizationAdmin), granting access only to organization admins. RBAC
 * enforcement and system integrity are expected throughout the application. No
 * use of native Date; all temporal values handled as strings. No type
 * assertions used. The function is production-ready, immutable, and strictly
 * typed for API and schema compliance.
 *
 * @param props - Properties containing:
 *
 *   - OrganizationAdmin: The authenticated organization admin
 *       (OrganizationadminPayload)
 *   - StatusId: The UUID of the appointment status to update
 *   - Body: The partial set of fields to update (display_name, business_status,
 *       sort_order)
 *
 * @returns The updated IHealthcarePlatformAppointmentStatus row after
 *   modification
 * @throws {Error} If statusId does not exist or the row cannot be found
 */
export async function puthealthcarePlatformOrganizationAdminAppointmentStatusesStatusId(props: {
  organizationAdmin: OrganizationadminPayload;
  statusId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentStatus.IUpdate;
}): Promise<IHealthcarePlatformAppointmentStatus> {
  const { statusId, body } = props;

  // 1. Find the appointment status by its UUID
  const existing =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findUnique({
      where: { id: statusId },
    });
  if (!existing) {
    throw new Error("Appointment status does not exist");
  }

  // 2. Update only permitted fields: display_name, business_status, sort_order
  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.update({
      where: { id: statusId },
      data: {
        display_name: body.display_name ?? undefined,
        business_status: body.business_status ?? undefined,
        sort_order: body.sort_order ?? undefined,
      },
    });

  // 3. Return the updated row with strict type compliance
  return {
    id: updated.id,
    status_code: updated.status_code,
    display_name: updated.display_name,
    business_status: updated.business_status,
    sort_order: updated.sort_order,
  };
}
