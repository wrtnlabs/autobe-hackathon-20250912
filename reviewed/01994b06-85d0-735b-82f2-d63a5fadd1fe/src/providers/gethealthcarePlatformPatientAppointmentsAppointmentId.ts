import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Fetch detailed information for a specific appointment by ID
 * (healthcare_platform_appointments).
 *
 * Retrieves all scheduling, participant, and resource details for a single
 * appointment event, enforcing that only the assigned patient can access their
 * own appointment. Business logic enforces strict RBAC and PHI boundaries: only
 * a patient whose ID matches the patient_id field of the appointment may view
 * the details. On successful access, an audit log is created for compliance and
 * security traceability. Audit failures do not prevent main retrieval.
 *
 * @param props - Parameters for fetching the appointment detail
 * @param props.patient - The authenticated patient (PatientPayload) requesting
 *   their appointment
 * @param props.appointmentId - Unique identifier of the appointment to retrieve
 * @returns Detailed appointment record (IHealthcarePlatformAppointment)
 * @throws {Error} If the appointment does not exist or is not accessible by the
 *   patient
 */
export async function gethealthcarePlatformPatientAppointmentsAppointmentId(props: {
  patient: PatientPayload;
  appointmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointment> {
  const { patient, appointmentId } = props;
  // Step 1: Fetch appointment (enforce soft delete filter)
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        deleted_at: null,
      },
    });
  if (!appointment) throw new Error("Appointment not found");

  // Step 2: Authorization check (patient can only view their own appointment)
  if (appointment.patient_id !== patient.id) {
    throw new Error(
      "Forbidden: You are not permitted to view this appointment",
    );
  }

  // Step 3: Write audit log (try/catch - tolerate logging errors)
  try {
    await MyGlobal.prisma.healthcare_platform_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_id: patient.id,
        organization_id: appointment.healthcare_platform_organization_id,
        action_type: "APPOINTMENT_VIEW",
        event_context: JSON.stringify({ appointment_id: appointmentId }),
        related_entity_type: "APPOINTMENT",
        related_entity_id: appointment.id,
        created_at: toISOStringSafe(new Date()),
        ip_address: undefined,
      },
    });
  } catch (error) {
    // Audit log failures are tolerated for view operations
  }

  // Step 4: Map all fields to API DTO, ensure proper type branding and null/undefined handling
  return {
    id: appointment.id,
    healthcare_platform_organization_id:
      appointment.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      appointment.healthcare_platform_department_id ?? undefined,
    provider_id: appointment.provider_id,
    patient_id: appointment.patient_id,
    status_id: appointment.status_id,
    room_id: appointment.room_id ?? undefined,
    equipment_id: appointment.equipment_id ?? undefined,
    appointment_type: appointment.appointment_type,
    start_time: toISOStringSafe(appointment.start_time),
    end_time: toISOStringSafe(appointment.end_time),
    title: appointment.title ?? undefined,
    description: appointment.description ?? undefined,
    recurrence_rule: appointment.recurrence_rule ?? undefined,
    created_at: toISOStringSafe(appointment.created_at),
    updated_at: toISOStringSafe(appointment.updated_at),
    deleted_at:
      appointment.deleted_at !== null && appointment.deleted_at !== undefined
        ? toISOStringSafe(appointment.deleted_at)
        : undefined,
  };
}
