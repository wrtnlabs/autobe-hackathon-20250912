import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Get details of a specific appointment waitlist entry.
 *
 * This operation retrieves detailed information about a specific waitlist entry
 * in the healthcare platform appointment system. The endpoint allows nurse
 * users to access all details for a specific waitlist entry in their
 * organizational scope (subject to external RBAC enforcement as necessary). All
 * business-required and audit-critical fields are included in the response,
 * with all timestamps returned as ISO8601 strings in correct branded types.
 *
 * @param props - Object containing nurse authentication, the appointment id,
 *   and the waitlist entry id to retrieve
 * @param props.nurse - The authenticated nurse user
 * @param props.appointmentId - Unique identifier for the appointment containing
 *   the waitlist
 * @param props.waitlistId - Unique identifier of the waitlist entry to retrieve
 * @returns Full details about the specified appointment waitlist entry (all
 *   audit, patient, status, and time metadata)
 * @throws {Error} If the entry is not found or access is not permitted by
 *   policy
 */
export async function gethealthcarePlatformNurseAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  nurse: NursePayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const entry =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        id: props.waitlistId,
        appointment_id: props.appointmentId,
      },
    });
  if (entry === null) {
    throw new Error("Waitlist entry not found");
  }
  return {
    id: entry.id,
    appointment_id: entry.appointment_id,
    patient_id: entry.patient_id,
    join_time: toISOStringSafe(entry.join_time),
    status: entry.status,
    created_at: toISOStringSafe(entry.created_at),
    updated_at: toISOStringSafe(entry.updated_at),
  };
}
