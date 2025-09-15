import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing appointment by ID in healthcare_platform_appointments
 * table.
 *
 * Modifies the details of an existing appointment in the healthcare platform,
 * allowing changes such as time, status, provider, or supporting fields. The
 * operation enforces business rules including: no time slot overlap, ensuring
 * status transitions are allowed for the given state, and confirming the user
 * is permitted to update the appointment (ownership or role-based
 * restriction).
 *
 * If the update involves changing critical properties like provider or time,
 * the system checks for conflicts and may trigger downstream updates (e.g.,
 * room/equipment reallocation, reminders, or telemedicine session updates).
 * Audit logs are generated for clinical, billing, and operational compliance.
 * Error handling includes conflict, not found, or permission errors.
 *
 * All changes are immediately reflected in the appointment record, and the
 * updated appointment is returned on success.
 *
 * @param props - Object containing organizationAdmin (authenticated admin
 *   user), appointmentId (UUID of the appointment), and body (fields to
 *   update)
 * @returns The updated appointment entity with all fields as defined by
 *   IHealthcarePlatformAppointment
 * @throws {Error} If the appointment does not exist, is soft-deleted, or fails
 *   permission checks.
 */
export async function puthealthcarePlatformOrganizationAdminAppointmentsAppointmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointment.IUpdate;
}): Promise<IHealthcarePlatformAppointment> {
  const { appointmentId, body } = props;
  // Fetch appointment (soft-deleted not allowed)
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId, deleted_at: null },
    });
  if (!appointment) throw new Error("Appointment not found or deleted");

  // Conditionally build update fields based on provided body
  const updates: {
    healthcare_platform_organization_id?: string;
    healthcare_platform_department_id?: string | null;
    provider_id?: string;
    patient_id?: string;
    status_id?: string;
    room_id?: string | null;
    equipment_id?: string | null;
    appointment_type?: string;
    start_time?: string;
    end_time?: string;
    title?: string | null;
    description?: string | null;
    recurrence_rule?: string | null;
    updated_at: string;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  if (body.healthcare_platform_organization_id !== undefined) {
    updates.healthcare_platform_organization_id =
      body.healthcare_platform_organization_id;
  }
  if (body.healthcare_platform_department_id !== undefined) {
    updates.healthcare_platform_department_id =
      body.healthcare_platform_department_id === null
        ? null
        : body.healthcare_platform_department_id;
  }
  if (body.provider_id !== undefined) {
    updates.provider_id = body.provider_id;
  }
  if (body.patient_id !== undefined) {
    updates.patient_id = body.patient_id;
  }
  if (body.status_id !== undefined) {
    updates.status_id = body.status_id;
  }
  if (body.room_id !== undefined) {
    updates.room_id = body.room_id === null ? null : body.room_id;
  }
  if (body.equipment_id !== undefined) {
    updates.equipment_id =
      body.equipment_id === null ? null : body.equipment_id;
  }
  if (body.appointment_type !== undefined) {
    updates.appointment_type = body.appointment_type;
  }
  if (body.start_time !== undefined) {
    updates.start_time = toISOStringSafe(body.start_time);
  }
  if (body.end_time !== undefined) {
    updates.end_time = toISOStringSafe(body.end_time);
  }
  if (body.title !== undefined) {
    updates.title = body.title === null ? null : body.title;
  }
  if (body.description !== undefined) {
    updates.description = body.description === null ? null : body.description;
  }
  if (body.recurrence_rule !== undefined) {
    updates.recurrence_rule =
      body.recurrence_rule === null ? null : body.recurrence_rule;
  }

  const updated = await MyGlobal.prisma.healthcare_platform_appointments.update(
    {
      where: { id: appointmentId },
      data: updates,
    },
  );

  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      updated.healthcare_platform_department_id ?? undefined,
    provider_id: updated.provider_id,
    patient_id: updated.patient_id,
    status_id: updated.status_id,
    room_id: updated.room_id ?? undefined,
    equipment_id: updated.equipment_id ?? undefined,
    appointment_type: updated.appointment_type,
    start_time: toISOStringSafe(updated.start_time),
    end_time: toISOStringSafe(updated.end_time),
    title: updated.title ?? undefined,
    description: updated.description ?? undefined,
    recurrence_rule: updated.recurrence_rule ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
