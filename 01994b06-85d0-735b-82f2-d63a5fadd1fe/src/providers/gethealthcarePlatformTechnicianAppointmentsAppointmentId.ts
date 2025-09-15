import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Fetch detailed information for a specific appointment by ID
 * (healthcare_platform_appointments).
 *
 * Retrieves the full appointment record, including all core scheduling
 * metadata, business and resource references, and descriptive fields. Access is
 * strictly limited to the assigned technician (appointment.provider_id ===
 * technician.id). An audit log is generated for every successful information
 * retrieval, in compliance with regulatory reporting and forensic traceability
 * requirements. This endpoint enforces role-based access: a technician can view
 * only those appointments to which they are assigned as provider.
 *
 * @param props - Request properties
 * @param props.technician - The authenticated technician user making the
 *   request (must be the assigned provider)
 * @param props.appointmentId - The unique UUID of the appointment to retrieve
 * @returns The requested appointment record as full detail DTO
 * @throws {Error} If the appointment does not exist, or the technician is not
 *   assigned as provider
 */
export async function gethealthcarePlatformTechnicianAppointmentsAppointmentId(props: {
  technician: TechnicianPayload;
  appointmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointment> {
  const { technician, appointmentId } = props;

  // Fetch the full appointment record by ID (error if not found)
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findUniqueOrThrow({
      where: { id: appointmentId },
    });

  // RBAC: technician may only view appointments to which they are assigned as provider
  if (appointment.provider_id !== technician.id) {
    throw new Error(
      "Unauthorized: You can only view appointments assigned to you",
    );
  }

  // Create audit log for compliance and regulatory purposes
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: technician.id,
      organization_id: appointment.healthcare_platform_organization_id,
      action_type: "RECORD_ACCESS",
      event_context: JSON.stringify({
        entity: "appointment",
        id: appointmentId,
      }),
      ip_address: undefined,
      related_entity_type: "APPOINTMENT",
      related_entity_id: appointmentId,
      created_at: toISOStringSafe(new Date()),
    },
  });

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
    deleted_at: appointment.deleted_at
      ? toISOStringSafe(appointment.deleted_at)
      : undefined, // retain undefined if null for optional
  };
}
