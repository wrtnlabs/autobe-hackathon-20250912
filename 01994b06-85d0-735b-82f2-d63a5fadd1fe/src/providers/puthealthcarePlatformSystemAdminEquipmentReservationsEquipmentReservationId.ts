import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing equipment reservation record
 * (healthcare_platform_equipment_reservations table) by identifier.
 *
 * Allows authorized users (systemAdmin role) to update the details of an
 * equipment reservation in the system. Fields such as reservation window,
 * status, and appointment linkage may be modified. Validates the existence of
 * the reservation, handles appointment_id business logic, and ensures
 * audit/compliance with timestamps.
 *
 * @param props - Operation properties
 * @param props.systemAdmin - Authenticated SystemadminPayload (global superuser
 *   privileges)
 * @param props.equipmentReservationId - UUID of equipment reservation to update
 * @param props.body - Updated fields for the equipment reservation (partial
 *   allowed)
 * @returns The updated equipment reservation record, mapped to API DTO
 *   specification
 * @throws {Error} When reservation is not found or soft-deleted
 * @throws {Error} When appointment_id is set to a non-existent record
 */
export async function puthealthcarePlatformSystemAdminEquipmentReservationsEquipmentReservationId(props: {
  systemAdmin: SystemadminPayload;
  equipmentReservationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEquipmentReservation.IUpdate;
}): Promise<IHealthcarePlatformEquipmentReservation> {
  const { systemAdmin, equipmentReservationId, body } = props;

  // Step 1: Find reservation (ensure not soft-deleted)
  const existing =
    await MyGlobal.prisma.healthcare_platform_equipment_reservations.findFirst({
      where: { id: equipmentReservationId, deleted_at: null },
    });
  if (!existing) {
    throw new Error("Reservation not found or already deleted");
  }

  // Step 2: If updating appointment_id, non-null must reference valid appointment
  if (body.appointment_id !== undefined && body.appointment_id !== null) {
    const appt =
      await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
        where: { id: body.appointment_id },
      });
    if (!appt) {
      throw new Error("Referenced appointment_id does not exist");
    }
  }

  // Step 3: Update record (use only updatable fields, only if defined)
  const updated =
    await MyGlobal.prisma.healthcare_platform_equipment_reservations.update({
      where: { id: equipmentReservationId },
      data: {
        reservation_start:
          body.reservation_start !== undefined
            ? body.reservation_start
            : undefined,
        reservation_end:
          body.reservation_end !== undefined ? body.reservation_end : undefined,
        reservation_type:
          body.reservation_type !== undefined
            ? body.reservation_type
            : undefined,
        appointment_id:
          body.appointment_id !== undefined ? body.appointment_id : undefined,
        updated_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
        healthcare_platform_organization_id: true,
        equipment_id: true,
        reservation_start: true,
        reservation_end: true,
        appointment_id: true,
        reservation_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  // Step 4: Return data (convert dates, handle nulls/optionals per DTO)
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    equipment_id: updated.equipment_id,
    reservation_start: toISOStringSafe(updated.reservation_start),
    reservation_end: toISOStringSafe(updated.reservation_end),
    appointment_id:
      updated.appointment_id === null
        ? null
        : (updated.appointment_id ?? undefined),
    reservation_type: updated.reservation_type,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : (updated.deleted_at ?? undefined),
  };
}
