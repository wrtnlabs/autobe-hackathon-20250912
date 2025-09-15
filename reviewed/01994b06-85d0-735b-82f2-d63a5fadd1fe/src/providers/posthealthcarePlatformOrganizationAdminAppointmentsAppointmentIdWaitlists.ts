import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Add a waitlist entry for a patient to a specific appointment (join waitlist).
 *
 * This operation creates a new waitlist entry for a specified appointment by an
 * organization admin. It ensures that the appointment exists and is active, and
 * that a patient is not already present on the waitlist for the appointment
 * (except for status 'removed'). If these conditions are met, a new waitlist
 * row is added and the full waitlist record is returned with all date fields in
 * ISO format. No native Date is used, and all values are strictly typed.
 *
 * @param props - Properties including the authenticated organization admin, the
 *   appointment ID, and the waitlist entry creation data.
 * @param props.organizationAdmin - The authenticated organization admin
 *   initiating the request.
 * @param props.appointmentId - Target appointment UUID for the waitlist
 *   operation.
 * @param props.body - Data to create the waitlist entry (patientId, status,
 *   join time).
 * @returns The newly created waitlist record in strict ISO date and UUID
 *   format.
 * @throws {Error} If the appointment does not exist, is deleted, or if business
 *   uniqueness rules are violated.
 */
export async function posthealthcarePlatformOrganizationAdminAppointmentsAppointmentIdWaitlists(props: {
  organizationAdmin: OrganizationadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.ICreate;
}): Promise<IHealthcarePlatformAppointmentWaitlist> {
  const { body, appointmentId } = props;

  // Confirm appointment exists (must not be deleted)
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId, deleted_at: null },
      select: { id: true },
    });
  if (!appointment) {
    throw new Error("Appointment not found or inaccessible");
  }

  // Ensure no duplicate waitlist entry for patient && appointment (ignoring entries with status 'removed')
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.findFirst({
      where: {
        appointment_id: body.appointment_id,
        patient_id: body.patient_id,
        status: { not: "removed" },
      },
    });
  if (duplicate) {
    throw new Error("Patient is already on the waitlist for this appointment");
  }

  // Timestamp to be used for created_at, updated_at, and (if missing) join_time
  const now = toISOStringSafe(new Date());

  // Create waitlist entry
  const created =
    await MyGlobal.prisma.healthcare_platform_appointment_waitlists.create({
      data: {
        id: v4(),
        appointment_id: body.appointment_id,
        patient_id: body.patient_id,
        join_time: body.join_time ?? now,
        status: body.status ?? "active",
        created_at: now,
        updated_at: now,
      },
    });

  // Return object as IHealthcarePlatformAppointmentWaitlist
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
