import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get details of a specific appointment waitlist entry.
 *
 * This operation retrieves comprehensive information about a specific
 * appointment's waitlist entry, including linked patient, join time, current
 * status, and all audit timestamps. Access control is enforced: only an
 * authenticated organization admin may invoke this logic (as validated by
 * upstream decorator).
 *
 * @param props - Parameters for the request.
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request (must have valid OrganizationadminPayload).
 * @param props.appointmentId - The unique identifier for the parent appointment
 *   whose waitlist is being queried.
 * @param props.waitlistId - The unique identifier of the waitlist entry to
 *   retrieve.
 * @returns The requested waitlist entry details in
 *   IHealthcarePlatformAppointmentWaitlist format.
 * @throws {Error} If the specified waitlist entry does not exist or the ids do
 *   not match any active entry.
 */
export async function gethealthcarePlatformOrganizationAdminAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  organizationAdmin: OrganizationadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { appointmentId, waitlistId } = props;
  const waitlist =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        id: waitlistId,
        appointment_id: appointmentId,
      },
    });
  if (!waitlist) {
    throw new Error("Appointment waitlist entry not found");
  }
  return {
    id: waitlist.id,
    appointment_id: waitlist.appointment_id,
    patient_id: waitlist.patient_id,
    join_time: toISOStringSafe(waitlist.join_time),
    status: waitlist.status,
    created_at: toISOStringSafe(waitlist.created_at),
    updated_at: toISOStringSafe(waitlist.updated_at),
  };
}
