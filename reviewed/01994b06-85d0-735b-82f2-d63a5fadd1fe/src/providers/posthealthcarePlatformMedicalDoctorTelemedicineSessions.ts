import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Create a new telemedicine session for a scheduled appointment.
 *
 * This operation enables the creation of a new telemedicine session within the
 * healthcarePlatform service. It validates that the appointment exists, ensures
 * the authenticated medical doctor is assigned to this appointment, and
 * enforces that only one session can exist per appointment. On successful
 * creation, persists and returns the full telemedicine session record.
 *
 * Authorization: Only the medical doctor assigned as provider to the
 * appointment can invoke this operation.
 *
 * @param props - Object containing required properties for telemedicine session
 *   creation
 * @param props.medicalDoctor - The authenticated provider/membership doctor
 *   creating the session
 * @param props.body - Payload including appointment association, session times,
 *   join link, and recording flag
 * @returns The newly created telemedicine session record with all metadata
 *   filled
 * @throws {Error} If the appointment does not exist, is not assigned to this
 *   provider, or a session already exists
 */
export async function posthealthcarePlatformMedicalDoctorTelemedicineSessions(props: {
  medicalDoctor: MedicaldoctorPayload;
  body: IHealthcarePlatformTelemedicineSession.ICreate;
}): Promise<IHealthcarePlatformTelemedicineSession> {
  const { medicalDoctor, body } = props;

  // Step 1: Ensure appointment exists
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findUnique({
      where: { id: body.appointment_id },
      select: { id: true, provider_id: true },
    });
  if (!appointment) {
    throw new Error("Appointment does not exist for specified appointment_id");
  }

  // Step 2: Confirm provider assignment
  if (appointment.provider_id !== medicalDoctor.id) {
    throw new Error(
      "You can only create telemedicine sessions for your own appointments",
    );
  }

  // Step 3: Ensure no other session exists for this appointment
  const exists =
    await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.findFirst({
      where: { appointment_id: body.appointment_id },
      select: { id: true },
    });
  if (exists) {
    throw new Error(
      "A telemedicine session already exists for this appointment",
    );
  }

  // Step 4: Create the session
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        appointment_id: body.appointment_id,
        join_link: body.join_link,
        session_start: body.session_start,
        session_end: body.session_end,
        provider_joined_at: body.provider_joined_at ?? null,
        patient_joined_at: body.patient_joined_at ?? null,
        session_recorded: body.session_recorded,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    appointment_id: created.appointment_id,
    join_link: created.join_link,
    session_start: toISOStringSafe(created.session_start),
    session_end: toISOStringSafe(created.session_end),
    provider_joined_at:
      created.provider_joined_at !== undefined &&
      created.provider_joined_at !== null
        ? toISOStringSafe(created.provider_joined_at)
        : null,
    patient_joined_at:
      created.patient_joined_at !== undefined &&
      created.patient_joined_at !== null
        ? toISOStringSafe(created.patient_joined_at)
        : null,
    session_recorded: created.session_recorded,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
