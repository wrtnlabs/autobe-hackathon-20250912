import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Fetch detailed information for a specific appointment by ID
 * (healthcare_platform_appointments).
 *
 * Retrieve the full detail for a single appointment event. The appointment is
 * returned only if it exists and the requesting department head leads the
 * department of the appointment. Enforces strict access control: only the
 * department head associated with the appointment's department may access these
 * details. All date values are returned as ISO 8601 strings. Throws an error if
 * appointment not found or access is forbidden.
 *
 * @param props - Properties for retrieving appointment
 * @param props.departmentHead - Authenticated department head's JWT payload
 * @param props.appointmentId - UUID of the appointment to fetch
 * @returns Appointment record with all scheduling, business, and relational
 *   context fields
 * @throws {Error} If appointment not found or forbidden due to mismatched
 *   department
 */
export async function gethealthcarePlatformDepartmentHeadAppointmentsAppointmentId(props: {
  departmentHead: DepartmentheadPayload;
  appointmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointment> {
  const { departmentHead, appointmentId } = props;
  // Fetch the appointment including soft-deletion state
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        deleted_at: null,
      },
    });
  if (!appointment) throw new Error("Appointment not found");

  // Ensure department assignment and access
  if (
    appointment.healthcare_platform_department_id == null ||
    appointment.healthcare_platform_department_id !== departmentHead.id
  ) {
    throw new Error("Forbidden");
  }

  // Return DTO with all date fields as branded ISO strings
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
      : undefined,
  };
}
