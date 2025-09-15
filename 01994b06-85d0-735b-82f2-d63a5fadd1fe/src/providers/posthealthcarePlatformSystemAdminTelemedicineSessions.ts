import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTelemedicineSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSession";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new telemedicine session record (TelemedicineSession table) in
 * healthcarePlatform.
 *
 * This operation enables system administrators to create new telemedicine
 * session records associated with appointments, initializing session join
 * links, recording flags, and time windows. Prevents duplicate session creation
 * per appointment and enforces appointment linkage.
 *
 * Authorization: Only system admins may invoke this operation.
 *
 * @param props - Parameters for session creation
 * @param props.systemAdmin - Authenticated SystemadminPayload
 * @param props.body - Telemedicine session creation payload
 * @returns Full telemedicine session record as created in the system
 * @throws {Error} When the appointment does not exist
 * @throws {Error} On duplicate session requests for the same appointment
 */
export async function posthealthcarePlatformSystemAdminTelemedicineSessions(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformTelemedicineSession.ICreate;
}): Promise<IHealthcarePlatformTelemedicineSession> {
  // Verify appointment existence (foreign key constraint is not explicit)
  const found =
    await MyGlobal.prisma.healthcare_platform_appointments.findUnique({
      where: { id: props.body.appointment_id },
      select: { id: true },
    });
  if (!found) {
    throw new Error("Appointment not found");
  }

  // Prepare all date-times via toISOStringSafe and generate uuid for id
  const now = toISOStringSafe(new Date());
  try {
    const created =
      await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.create({
        data: {
          id: v4(),
          appointment_id: props.body.appointment_id,
          join_link: props.body.join_link,
          session_start: props.body.session_start,
          session_end: props.body.session_end,
          provider_joined_at: props.body.provider_joined_at ?? undefined,
          patient_joined_at: props.body.patient_joined_at ?? undefined,
          session_recorded: props.body.session_recorded,
          created_at: now,
          updated_at: now,
        },
      });
    return {
      id: created.id,
      appointment_id: created.appointment_id,
      join_link: created.join_link,
      session_start: created.session_start,
      session_end: created.session_end,
      provider_joined_at: created.provider_joined_at ?? undefined,
      patient_joined_at: created.patient_joined_at ?? undefined,
      session_recorded: created.session_recorded,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };
  } catch (err) {
    // Unique constraint error for duplicate telemedicine session (appointment_id)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error(
        "Telemedicine session already exists for this appointment",
      );
    }
    throw err;
  }
}
