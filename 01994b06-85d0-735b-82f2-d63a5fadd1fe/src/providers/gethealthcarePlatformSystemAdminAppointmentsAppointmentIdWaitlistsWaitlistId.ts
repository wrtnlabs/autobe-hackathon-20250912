import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get details of a specific appointment waitlist entry.
 *
 * Retrieves detailed information for an individual appointment waitlist entry,
 * including patient ID, appointment ID, join time, current status (active,
 * promoted, removed), and audit timestamps (created_at, updated_at).
 *
 * SystemAdmin can access any waitlist entry in the platform subject to
 * referential integrity rules.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - Authenticated Systemadmin payload (authorization
 *   enforced by decorator)
 * @param props.appointmentId - The unique identifier for the target appointment
 * @param props.waitlistId - The unique identifier for the waitlist entry to
 *   fetch
 * @returns Full details for the specified appointment waitlist entry
 * @throws {Error} If the waitlist entry does not exist
 */
export async function gethealthcarePlatformSystemAdminAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  systemAdmin: SystemadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { appointmentId, waitlistId } = props;
  const waitlistEntry =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        id: waitlistId,
        appointment_id: appointmentId,
        // 'deleted_at' filter removed - field does not exist
      },
      select: {
        id: true,
        appointment_id: true,
        patient_id: true,
        join_time: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

  if (!waitlistEntry) {
    throw new Error("Waitlist entry not found");
  }

  return {
    id: waitlistEntry.id,
    appointment_id: waitlistEntry.appointment_id,
    patient_id: waitlistEntry.patient_id,
    join_time: toISOStringSafe(waitlistEntry.join_time),
    status: waitlistEntry.status,
    created_at: toISOStringSafe(waitlistEntry.created_at),
    updated_at: toISOStringSafe(waitlistEntry.updated_at),
  };
}
