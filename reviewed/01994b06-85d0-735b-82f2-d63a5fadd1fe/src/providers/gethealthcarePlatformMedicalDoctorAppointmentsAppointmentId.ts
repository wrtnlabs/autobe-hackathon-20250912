import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Fetch detailed information for a specific appointment by ID
 * (healthcare_platform_appointments).
 *
 * Retrieves a fully detailed appointment record including all fields and
 * context from the database, enforcing that only the assigned provider medical
 * doctor can view this data. Performs soft-delete filtering, strict
 * authorization, and appends an immutable audit access log in accordance with
 * regulatory requirements. All datetime values are consistently returned as
 * strings in strict ISO 8601 UTC format.
 *
 * @param props.medicalDoctor - The authenticated medical doctor making the
 *   request (JWT payload)
 * @param props.appointmentId - The UUID of the target appointment
 * @returns The appointment details as IHealthcarePlatformAppointment if
 *   authorized
 * @throws {Error} If appointment is not found or the doctor is not the assigned
 *   provider
 */
export async function gethealthcarePlatformMedicalDoctorAppointmentsAppointmentId(props: {
  medicalDoctor: MedicaldoctorPayload;
  appointmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointment> {
  const { medicalDoctor, appointmentId } = props;

  // Find the appointment and ensure it is not soft-deleted
  const appt =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirstOrThrow({
      where: {
        id: appointmentId,
        deleted_at: null,
      },
    });

  // Only the assigned provider is allowed to access
  if (appt.provider_id !== medicalDoctor.id) {
    throw new Error(
      "Access denied: medical doctor is not the provider on this appointment",
    );
  }

  // Audit: Log this access event
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: medicalDoctor.id,
      organization_id: appt.healthcare_platform_organization_id,
      action_type: "RECORD_READ",
      related_entity_type: "APPOINTMENT",
      related_entity_id: appt.id,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Return response mapping, with all date/datetime fields mapped to string
  return {
    id: appt.id,
    healthcare_platform_organization_id:
      appt.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      appt.healthcare_platform_department_id ?? undefined,
    provider_id: appt.provider_id,
    patient_id: appt.patient_id,
    status_id: appt.status_id,
    room_id: appt.room_id ?? undefined,
    equipment_id: appt.equipment_id ?? undefined,
    appointment_type: appt.appointment_type,
    start_time: toISOStringSafe(appt.start_time),
    end_time: toISOStringSafe(appt.end_time),
    title: appt.title ?? undefined,
    description: appt.description ?? undefined,
    recurrence_rule: appt.recurrence_rule ?? undefined,
    created_at: toISOStringSafe(appt.created_at),
    updated_at: toISOStringSafe(appt.updated_at),
    deleted_at: appt.deleted_at ? toISOStringSafe(appt.deleted_at) : undefined,
  };
}
