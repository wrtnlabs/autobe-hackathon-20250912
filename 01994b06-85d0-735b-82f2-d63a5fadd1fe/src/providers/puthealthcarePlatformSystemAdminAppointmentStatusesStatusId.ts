import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an appointment status in healthcare_platform_appointment_statuses
 * table.
 *
 * Updates the details of a specific appointment status identified by statusId.
 * This operation allows a system administrator to change updatable attributes
 * (display name, business status, or sort order) for workflow, display, or
 * operational needs. status_code and id fields are immutable and cannot be
 * updated. Throws if the target status does not exist.
 *
 * Systemadministrators may use this for platform-wide or RBAC-driven
 * appointment workflow configuration. Expects valid UUID for statusId and a
 * proper update body.
 *
 * @param props -
 *
 *   - SystemAdmin: The authenticated SystemadminPayload (top-level system admin,
 *       already authorized)
 *   - StatusId: UUID of the appointment status to update
 *   - Body: The update object with optional display_name, business_status, and/or
 *       sort_order
 *
 * @returns The updated appointment status object reflecting changes
 * @throws {Error} If the target appointment status is not found or cannot be
 *   updated
 */
export async function puthealthcarePlatformSystemAdminAppointmentStatusesStatusId(props: {
  systemAdmin: SystemadminPayload;
  statusId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentStatus.IUpdate;
}): Promise<IHealthcarePlatformAppointmentStatus> {
  const { statusId, body } = props;

  // Authorization is enforced by decorator - no explicit check needed here

  // Ensure the appointment status exists
  const target =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findFirst({
      where: { id: statusId },
    });
  if (!target) throw new Error("Appointment status not found");

  // Only update fields provided in the body. (status_code/id are immutable)
  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.update({
      where: { id: statusId },
      data: {
        display_name:
          body.display_name !== undefined ? body.display_name : undefined,
        business_status:
          body.business_status !== undefined ? body.business_status : undefined,
        sort_order: body.sort_order !== undefined ? body.sort_order : undefined,
      },
    });

  // Assemble DTO - strict typing, no as needed
  return {
    id: updated.id,
    status_code: updated.status_code,
    display_name: updated.display_name,
    business_status:
      typeof updated.business_status !== "undefined" &&
      updated.business_status !== null
        ? updated.business_status
        : undefined,
    sort_order: updated.sort_order,
  };
}
