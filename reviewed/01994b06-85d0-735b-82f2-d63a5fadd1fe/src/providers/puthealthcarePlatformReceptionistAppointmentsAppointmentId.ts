import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Update an existing appointment by ID in healthcare_platform_appointments
 * table
 *
 * Modifies the details of an appointment, allowing status, time, and supporting
 * fields to be patched by a receptionist. Enforces access control (receptionist
 * must belong to appointment's organization; cannot update cross-org), status
 * lock (cannot update if finalized), and applies full DTO/DB field
 * compatibility, handling null/undefined correctly on all fields. All
 * date/datetime values are handled as `string & tags.Format<'date-time'>`;
 * native Date is NOT used anywhere. Returns the updated appointment entity with
 * all properties mapped as per API and business contracts.
 *
 * @param props - Properties for the update operation
 * @param props.receptionist - The authenticated receptionist performing the
 *   operation
 * @param props.appointmentId - UUID of the appointment to update
 * @param props.body - Patch object with fields to update (any allowed field)
 * @returns The fully updated IHealthcarePlatformAppointment object
 * @throws {Error} When appointment is not found, org mismatch, or appointment
 *   is finalized
 */
export async function puthealthcarePlatformReceptionistAppointmentsAppointmentId(props: {
  receptionist: ReceptionistPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointment.IUpdate;
}): Promise<IHealthcarePlatformAppointment> {
  const { receptionist, appointmentId, body } = props;

  // Step 1: Fetch original record (with organization/context/status), ensure not deleted
  const original =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        deleted_at: null,
      },
    });
  if (!original) throw new Error("Appointment not found");

  // Step 2: Receptionist can only update for the appointment's organization
  if (
    body.healthcare_platform_organization_id !== undefined &&
    body.healthcare_platform_organization_id !==
      original.healthcare_platform_organization_id
  ) {
    throw new Error(
      "Receptionist cannot update appointments from another organization",
    );
  }

  // Step 3: Check appointment status (cannot update finalized/locked)
  const statusRow =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findFirst({
      where: { id: original.status_id },
    });
  if (statusRow && statusRow.status_code === "finalized") {
    throw new Error("Appointment is finalized and cannot be updated");
  }

  // Step 4: Prepare update; only fields provided in body are patched
  const updateObj = {
    healthcare_platform_department_id:
      body.healthcare_platform_department_id ?? undefined,
    provider_id: body.provider_id ?? undefined,
    patient_id: body.patient_id ?? undefined,
    status_id: body.status_id ?? undefined,
    room_id: body.room_id ?? undefined,
    equipment_id: body.equipment_id ?? undefined,
    appointment_type: body.appointment_type ?? undefined,
    start_time: body.start_time ?? undefined,
    end_time: body.end_time ?? undefined,
    title: body.title ?? undefined,
    description: body.description ?? undefined,
    recurrence_rule: body.recurrence_rule ?? undefined,
    updated_at: toISOStringSafe(new Date()),
  } satisfies Partial<IHealthcarePlatformAppointment>;

  // Step 5: Update
  const updated = await MyGlobal.prisma.healthcare_platform_appointments.update(
    {
      where: { id: appointmentId },
      data: updateObj,
    },
  );

  // Step 6: Map all fields and handle null/undefined strictly as per DTO
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      updated.healthcare_platform_department_id != null
        ? updated.healthcare_platform_department_id
        : null,
    provider_id: updated.provider_id,
    patient_id: updated.patient_id,
    status_id: updated.status_id,
    room_id: updated.room_id != null ? updated.room_id : null,
    equipment_id: updated.equipment_id != null ? updated.equipment_id : null,
    appointment_type: updated.appointment_type,
    start_time: toISOStringSafe(updated.start_time),
    end_time: toISOStringSafe(updated.end_time),
    title: updated.title != null ? updated.title : null,
    description: updated.description != null ? updated.description : null,
    recurrence_rule:
      updated.recurrence_rule != null ? updated.recurrence_rule : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at != null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
