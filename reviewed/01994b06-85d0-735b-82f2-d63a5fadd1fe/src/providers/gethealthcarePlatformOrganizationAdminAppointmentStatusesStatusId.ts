import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get full details for a single appointment status identified by statusId.
 *
 * This operation retrieves the full configuration details for the appointment
 * status specified by its unique statusId, supporting admin workflows,
 * scheduling configuration UIs, and integration clients needing to reason about
 * appointment status logic.
 *
 * Authorization: Requires authenticated organizationAdmin context (validated by
 * upstream decorator).
 *
 * @param props - organizationAdmin: The authenticated organization admin
 *   performing the request statusId: The unique identifier for the appointment
 *   status to retrieve
 * @returns The full IHealthcarePlatformAppointmentStatus record for the
 *   statusId
 * @throws {Error} If no such statusId exists in the table
 */
export async function gethealthcarePlatformOrganizationAdminAppointmentStatusesStatusId(props: {
  organizationAdmin: OrganizationadminPayload;
  statusId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentStatus> {
  const { statusId } = props;
  const record =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findFirst({
      where: { id: statusId },
      select: {
        id: true,
        status_code: true,
        display_name: true,
        business_status: true,
        sort_order: true,
      },
    });
  if (!record) {
    throw new Error("Appointment status not found");
  }
  return {
    id: record.id,
    status_code: record.status_code,
    display_name: record.display_name,
    // If DB has null, omit entirely for DTO optional; if string, set it
    ...(record.business_status !== null
      ? { business_status: record.business_status }
      : {}),
    sort_order: record.sort_order,
  };
}
