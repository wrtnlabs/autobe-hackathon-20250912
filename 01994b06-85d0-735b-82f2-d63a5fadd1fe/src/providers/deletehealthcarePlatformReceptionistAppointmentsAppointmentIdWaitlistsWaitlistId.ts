import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Erase a patient waitlist entry from a specific appointment (hard delete,
 * Scheduling)
 *
 * This operation permanently erases a specific patient waitlist entry for an
 * appointment in the healthcarePlatform Scheduling system. It targets the
 * healthcare_platform_appointment_waitlists table, removing the waitlist record
 * identified by both appointmentId and waitlistId. This supports administrative
 * and clinical flows for managing appointment availability and waitlist status,
 * including when a patient is promoted from waitlist, cancels their request, or
 * is no longer eligible/needed for the slot.
 *
 * Only authenticated receptionist staff may perform this operation. Attempts to
 * erase a non-existent or already-deleted waitlist entry yield a suitable error
 * response. Erasures associated with active appointments are permitted. This
 * function performs a hard delete (no soft delete is supported on this model).
 *
 * @param props - Object containing the receptionist payload (for
 *   authentication) and the identifiers of the appointment and waitlist entry
 * @param props.receptionist - Authenticated ReceptionistPayload
 * @param props.appointmentId - Unique identifier of the target appointment
 * @param props.waitlistId - Unique identifier of the patient's waitlist entry
 *   to be deleted for the given appointment
 * @returns Void
 * @throws {Error} When the waitlist entry is not found or does not belong to
 *   the specified appointment
 */
export async function deletehealthcarePlatformReceptionistAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  receptionist: ReceptionistPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { receptionist, appointmentId, waitlistId } = props;

  // Find the waitlist entry and ensure it belongs to the right appointment
  const waitlistEntry =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findUnique({
      where: {
        id: waitlistId,
      },
    });
  if (!waitlistEntry || waitlistEntry.appointment_id !== appointmentId) {
    throw new Error("Waitlist entry not found for specified appointment");
  }

  // Perform the hard delete (no soft delete is supported)
  await MyGlobal.prisma.healthcare_platform_appointment_waitlists.delete({
    where: { id: waitlistId },
  });
}
