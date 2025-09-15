import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Fetch detailed information for a specific appointment by ID
 * (healthcare_platform_appointments).
 *
 * Retrieves all business, scheduling, and clinical context for the specified
 * appointmentId within the healthcare platform. Systemadmin (platform-level
 * admin) is authorized to access all appointment details across organizations.
 *
 * - Throws error if the appointment does not exist or is archived (soft-deleted).
 * - Records a compliance audit log for the access.
 * - Returns the complete IHealthcarePlatformAppointment DTO with all fields and
 *   proper ISO date formatting.
 *
 * @param props - systemAdmin: The authenticated system administrator payload
 *   requesting the appointment detail. appointmentId: The unique UUID of the
 *   appointment event to fetch.
 * @returns The full appointment details object.
 * @throws {Error} If the appointment does not exist or is soft-deleted.
 */
export async function gethealthcarePlatformSystemAdminAppointmentsAppointmentId(props: {
  systemAdmin: SystemadminPayload;
  appointmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointment> {
  const { systemAdmin, appointmentId } = props;
  const record =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        deleted_at: null,
      },
    });
  if (!record) {
    throw new Error("Appointment not found");
  }

  // Prepare audit log timestamp
  const auditCreatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: systemAdmin.id,
      organization_id: record.healthcare_platform_organization_id,
      action_type: "RECORD_VIEW",
      event_context: undefined,
      ip_address: undefined,
      related_entity_type: "APPOINTMENT",
      related_entity_id: record.id,
      created_at: auditCreatedAt,
    },
  });
  return {
    id: record.id,
    healthcare_platform_organization_id:
      record.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      record.healthcare_platform_department_id ?? undefined,
    provider_id: record.provider_id,
    patient_id: record.patient_id,
    status_id: record.status_id,
    room_id: record.room_id ?? undefined,
    equipment_id: record.equipment_id ?? undefined,
    appointment_type: record.appointment_type,
    start_time: toISOStringSafe(record.start_time),
    end_time: toISOStringSafe(record.end_time),
    title: record.title ?? undefined,
    description: record.description ?? undefined,
    recurrence_rule: record.recurrence_rule ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
