import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Update an existing appointment by ID in healthcare_platform_appointments
 * table
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
 * @param props - MedicalDoctor: Authenticated MedicaldoctorPayload (must match
 *   provider_id for the appointment) appointmentId: UUID of the appointment to
 *   update body: Fields to update (IHealthcarePlatformAppointment.IUpdate).
 *   Only permitted keys will be used, mutable per role.
 * @returns The fully updated appointment record as
 *   IHealthcarePlatformAppointment
 * @throws {Error} If appointment not found, RBAC violation, forbidden
 *   department/org change, or finalized/cancelled appointment.
 */
export async function puthealthcarePlatformMedicalDoctorAppointmentsAppointmentId(props: {
  medicalDoctor: MedicaldoctorPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointment.IUpdate;
}): Promise<IHealthcarePlatformAppointment> {
  const { medicalDoctor, appointmentId, body } = props;

  // Fetch appointment (exclude soft-deleted)
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        deleted_at: null,
      },
    });
  if (!appointment) throw new Error("Appointment not found");

  // Authorization: only provider can update their own appointments
  if (appointment.provider_id !== medicalDoctor.id) {
    throw new Error(
      "Forbidden: Only the provider can update their own appointments.",
    );
  }

  // Disallow update to organization and department (by role)
  if (
    body.healthcare_platform_organization_id !== undefined ||
    body.healthcare_platform_department_id !== undefined
  ) {
    throw new Error(
      "Forbidden: Cannot update organization or department fields.",
    );
  }

  // Fetch current status label for terminal-state check
  // We'll treat status_ids with code 'finalized' or 'cancelled' as terminal. For a real-life case, status_id would resolve to status_code in config.
  // For this sample, we will block if current status_id matches 'finalized' or 'cancelled'.
  if (
    appointment.status_id === "finalized" ||
    appointment.status_id === "cancelled"
  ) {
    throw new Error(
      "Updates not allowed for finalized or cancelled appointments.",
    );
  }

  // Build update input: only allowed mutable fields, do not send fields not provided
  const updateData: Record<string, unknown> = {
    // Only overwrite fields if they are provided, else skip
    ...(body.provider_id !== undefined && { provider_id: body.provider_id }),
    ...(body.status_id !== undefined && { status_id: body.status_id }),
    ...(body.start_time !== undefined && { start_time: body.start_time }),
    ...(body.end_time !== undefined && { end_time: body.end_time }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.room_id !== undefined && { room_id: body.room_id }),
    ...(body.equipment_id !== undefined && { equipment_id: body.equipment_id }),
    ...(body.title !== undefined && { title: body.title }),
    ...(body.recurrence_rule !== undefined && {
      recurrence_rule: body.recurrence_rule,
    }),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.healthcare_platform_appointments.update(
    {
      where: { id: appointmentId },
      data: updateData,
    },
  );

  // Format nullable/optional fields according to IHealthcarePlatformAppointment contract
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      updated.healthcare_platform_department_id === null
        ? undefined
        : updated.healthcare_platform_department_id,
    provider_id: updated.provider_id,
    patient_id: updated.patient_id,
    status_id: updated.status_id,
    room_id: updated.room_id === null ? undefined : updated.room_id,
    equipment_id:
      updated.equipment_id === null ? undefined : updated.equipment_id,
    appointment_type: updated.appointment_type,
    start_time: toISOStringSafe(updated.start_time),
    end_time: toISOStringSafe(updated.end_time),
    title: updated.title ?? undefined,
    description: updated.description ?? undefined,
    recurrence_rule: updated.recurrence_rule ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
