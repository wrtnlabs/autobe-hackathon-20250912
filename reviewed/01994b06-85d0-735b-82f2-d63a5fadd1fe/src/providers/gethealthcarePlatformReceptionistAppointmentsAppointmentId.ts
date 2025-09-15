import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Fetch detailed information for a specific appointment by ID
 * (healthcare_platform_appointments).
 *
 * Retrieves the full appointment record, including all business and scheduling
 * fields, by primary key. Only active (soft-delete not set) appointments can be
 * accessed. Receptionist role (authenticated) is required; RBAC boundaries are
 * enforced by the caller. All date fields are formatted as ISO8601 strings
 * (`string & tags.Format<'date-time'>`).
 *
 * @param props - Props object containing authorization payload and appointment
 *   ID
 * @param props.receptionist - The authenticated receptionist making the request
 * @param props.appointmentId - The unique appointment UUID to lookup
 * @returns The matching appointment record as IHealthcarePlatformAppointment
 *   DTO
 * @throws {Error} If no matching active appointment is found for the provided
 *   ID
 */
export async function gethealthcarePlatformReceptionistAppointmentsAppointmentId(props: {
  receptionist: ReceptionistPayload;
  appointmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointment> {
  const { appointmentId } = props;
  // Fetch the appointment record ensuring it is not soft deleted
  const row = await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
    where: { id: appointmentId, deleted_at: null },
  });
  if (!row) throw new Error("Appointment not found");
  // Optionally log audit event (not implemented — placeholder)
  // await MyGlobal.prisma.healthcare_platform_audit_logs.create({...})
  return {
    id: row.id,
    healthcare_platform_organization_id:
      row.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      row.healthcare_platform_department_id ?? undefined,
    provider_id: row.provider_id,
    patient_id: row.patient_id,
    status_id: row.status_id,
    room_id: row.room_id ?? undefined,
    equipment_id: row.equipment_id ?? undefined,
    appointment_type: row.appointment_type,
    start_time: toISOStringSafe(row.start_time),
    end_time: toISOStringSafe(row.end_time),
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    recurrence_rule: row.recurrence_rule ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  };
}
