import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Add a waitlist entry for a patient to a specific appointment (join waitlist).
 *
 * This endpoint enables a patient to join the waitlist for a specific
 * appointment. It ensures the patient is only joining for themselves (patients
 * cannot waitlist other patients), prevents duplicate waitlist entries for the
 * same appointment, and sets join timestamps and status appropriately.
 *
 * All timestamps are generated and returned as ISO8601 date-time strings. The
 * operation is fully type-safe, immutable, and does not use native Date types
 * or type assertions.
 *
 * @param props.patient - The authenticated patient making the request (must
 *   match patient_id in body)
 * @param props.appointmentId - UUID identifying the target appointment (must
 *   match appointment_id in body)
 * @param props.body - Waitlist join information (patient_id, join_time
 *   (optional), status (optional))
 * @returns The newly created waitlist entry with all required fields populated
 * @throws {Error} If patient_id in body does not match authenticated patient
 * @throws {Error} If appointment_id in body does not match the URL parameter
 * @throws {Error} If the patient is already on the waitlist for this
 *   appointment
 */
export async function posthealthcarePlatformPatientAppointmentsAppointmentIdWaitlists(props: {
  patient: PatientPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.ICreate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { patient, appointmentId, body } = props;

  // Enforce that the patient can only waitlist themselves
  if (body.patient_id !== patient.id) {
    throw new Error("Patients can only join the waitlist for themselves.");
  }

  // Enforce appointment_id in body matches the path param
  if (body.appointment_id !== appointmentId) {
    throw new Error(
      "appointment_id in request body must match the appointmentId path parameter.",
    );
  }

  // Prevent duplicate waitlist entries (uniqueness is enforced by schema, but we check for friendly error)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        appointment_id: appointmentId,
        patient_id: patient.id,
      },
    });
  if (duplicate) {
    throw new Error("Patient is already on the waitlist for this appointment.");
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const join_time: string & tags.Format<"date-time"> = body.join_time ?? now;
  const status: string = body.status ?? "active";

  const created =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.create({
      data: {
        id: v4(),
        appointment_id: appointmentId,
        patient_id: patient.id,
        join_time,
        status,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    appointment_id: created.appointment_id,
    patient_id: created.patient_id,
    join_time: created.join_time,
    status: created.status,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
