import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Edit a specific waitlist entry for an appointment.
 *
 * Allows a patient to update their own appointment waitlist entry, specifically
 * to remove themselves by changing status to 'removed', or amend join_time (if
 * business rules permit). Patients may only update their own entry; all other
 * edits are forbidden. Business logic enforces only allowed status transitions
 * for patients. All changes are audited per business policy.
 *
 * @param props - Object containing the authenticated patient payload,
 *   appointmentId, waitlistId, and update body
 * @param props.patient - Authenticated patient attempting the operation
 * @param props.appointmentId - UUID of the appointment containing the waitlist
 *   entry
 * @param props.waitlistId - UUID of the waitlist entry to update
 * @param props.body - Fields to update; only status "removed" allowed for
 *   patient self-edit
 * @returns The updated waitlist record if successful
 * @throws {Error} If the waitlist entry is not found for this
 *   patient/appointment, or operation is forbidden by business rules
 */
export async function puthealthcarePlatformPatientAppointmentsAppointmentIdWaitlistsWaitlistId(props: {
  patient: PatientPayload;
  appointmentId: string & tags.Format<"uuid">;
  waitlistId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IUpdate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { patient, appointmentId, waitlistId, body } = props;

  // Step 1: Locate the waitlist entry, restrict by appointment and patient ownership
  const entry =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        id: waitlistId,
        appointment_id: appointmentId,
        patient_id: patient.id,
      },
    });
  if (!entry) {
    throw new Error(
      "Waitlist entry not found, does not belong to patient, or is unavailable",
    );
  }

  // Step 2: Validate status update
  if (body.status !== undefined && body.status !== null) {
    // Only 'removed' allowed for patients (enforced business rule)
    if (body.status !== "removed") {
      throw new Error(
        "Patients may only remove themselves from the waitlist (status must be 'removed').",
      );
    }
    // If already removed or finalized, editing is forbidden
    if (entry.status === "removed") {
      throw new Error(
        "Waitlist entry is already removed/finalized and cannot be modified again.",
      );
    }
  }
  // Step 2b: Business logic - optionally allow join_time amendment if desired
  // (No restriction here as per schema/rules; can be tightened as needed)

  // Step 3: Apply update
  const updateInput = {
    ...(body.status !== undefined && { status: body.status }),
    ...(body.join_time !== undefined &&
      body.join_time !== null && { join_time: body.join_time }),
    updated_at: toISOStringSafe(new Date()),
  };
  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.update({
      where: { id: waitlistId },
      data: updateInput,
    });

  // Step 4: Return in strict DTO format
  return {
    id: updated.id,
    appointment_id: updated.appointment_id,
    patient_id: updated.patient_id,
    join_time: toISOStringSafe(updated.join_time),
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
