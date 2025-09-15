import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Permanently delete a telemedicine session by telemedicineSessionId
 * (TelemedicineSession table hard delete).
 *
 * This operation deletes (permanently removes) a telemedicine session record
 * from the healthcarePlatform's TelemedicineSession table. Deletion is
 * permanent: all related data is removed and cannot be recovered. Only the
 * assigned (provider) medical doctor may delete their own sessions. This action
 * is audited for compliance. If the session does not exist or the acting doctor
 * is not the assigned provider, an error is thrown.
 *
 * @param props - The request object
 * @param props.medicalDoctor - The authenticated medical doctor (role:
 *   medicalDoctor)
 * @param props.telemedicineSessionId - The UUID of the telemedicine session to
 *   permanently delete
 * @returns Void (successful hard delete operation)
 * @throws {Error} If session not found, appointment not found, or doctor does
 *   not own the session
 */
export async function deletehealthcarePlatformMedicalDoctorTelemedicineSessionsTelemedicineSessionId(props: {
  medicalDoctor: MedicaldoctorPayload;
  telemedicineSessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { medicalDoctor, telemedicineSessionId } = props;

  // 1. Fetch the telemedicine session
  const session =
    await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.findUniqueOrThrow(
      {
        where: { id: telemedicineSessionId },
        select: { appointment_id: true },
      },
    );

  // 2. Fetch the associated appointment for provider check
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findUniqueOrThrow({
      where: { id: session.appointment_id },
      select: { provider_id: true },
    });

  // 3. Confirm only the rightful owner/doctor can delete
  if (appointment.provider_id !== medicalDoctor.id) {
    throw new Error(
      "You are not authorized to delete this telemedicine session. Only the assigned medical doctor can perform this operation.",
    );
  }

  // 4. Hard delete the session (permanent removal; NOT a soft delete)
  await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.delete({
    where: { id: telemedicineSessionId },
  });
}
