import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Update details for a telemedicine session (TelemedicineSession table) by
 * telemedicineSessionId.
 *
 * This operation updates an existing telemedicine session record in the
 * healthcare platform. Only the provider (medical doctor) associated with the
 * linked appointment is authorized to update the session. While the update
 * schema currently allows no updatable fields, this endpoint updates the
 * `updated_at` field to ensure compliance with audit trail requirements. All
 * relevant validations, ownership, and audit are strictly enforced.
 *
 * @param props - The arguments for the update operation
 * @param props.medicalDoctor - Authenticated medical doctor payload (must be
 *   the provider on the appointment)
 * @param props.telemedicineSessionId - The UUID of the telemedicine session to
 *   update
 * @param props.body - The update payload (currently empty as per schema)
 * @returns The updated telemedicine session record, fully transformed to API
 *   structure
 * @throws {Error} If the session does not exist, the appointment does not
 *   exist, or the authenticated doctor does not own this session
 */
export async function puthealthcarePlatformMedicalDoctorTelemedicineSessionsTelemedicineSessionId(props: {
  medicalDoctor: MedicaldoctorPayload;
  telemedicineSessionId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformTelemedicineSession.IUpdate;
}): Promise<IHealthcarePlatformTelemedicineSession> {
  // Retrieve the telemedicine session (must not be soft-deleted)
  const session =
    await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.findFirst({
      where: {
        id: props.telemedicineSessionId,
      },
    });
  if (!session) {
    throw new Error("Telemedicine session not found");
  }

  // Retrieve the related appointment to enforce provider ownership
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: session.appointment_id },
    });
  if (!appointment) {
    throw new Error("Linked appointment not found");
  }

  // Only the provider may update this session
  if (appointment.provider_id !== props.medicalDoctor.id) {
    throw new Error("Unauthorized: Only the provider may update this session");
  }

  // Update audit timestamp (updated_at field only, as no updatable fields in IUpdate are allowed)
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.update({
      where: { id: props.telemedicineSessionId },
      data: { updated_at: now },
    });

  // Transform DB response to DTO format, converting dates to ISO8601 and handling nullables properly
  return {
    id: updated.id,
    appointment_id: updated.appointment_id,
    join_link: updated.join_link,
    session_start: toISOStringSafe(updated.session_start),
    session_end: toISOStringSafe(updated.session_end),
    provider_joined_at: updated.provider_joined_at
      ? toISOStringSafe(updated.provider_joined_at)
      : null,
    patient_joined_at: updated.patient_joined_at
      ? toISOStringSafe(updated.patient_joined_at)
      : null,
    session_recorded: updated.session_recorded,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
