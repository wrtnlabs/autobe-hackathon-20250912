import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Get full details for a single appointment status identified by statusId.
 *
 * Retrieves a specific appointment status from the
 * healthcare_platform_appointment_statuses table. Provides its workflow code,
 * display name, business grouping (active, closed), and sorting order. This is
 * required for workflow configuration and scheduling logic in downstream
 * modules.
 *
 * @param props - Request properties
 * @param props.receptionist - Authenticated receptionist user making the
 *   request
 * @param props.statusId - Unique identifier for the appointment status to
 *   retrieve
 * @returns The appointment status details, including code, label, grouping, and
 *   sort order
 * @throws {Error} If the statusId does not exist
 */
export async function gethealthcarePlatformReceptionistAppointmentStatusesStatusId(props: {
  receptionist: ReceptionistPayload;
  statusId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentStatus> {
  const { statusId } = props;
  const status =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findUnique({
      where: { id: statusId },
    });
  if (!status) throw new Error("Appointment status not found");
  return {
    id: status.id,
    status_code: status.status_code,
    display_name: status.display_name,
    business_status: status.business_status ?? undefined,
    sort_order: status.sort_order,
  };
}
