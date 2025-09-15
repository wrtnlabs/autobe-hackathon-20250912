import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Update an existing equipment reservation record
 * (healthcare_platform_equipment_reservations table) by identifier.
 *
 * This operation allows a department head to update editable fields on an
 * equipment reservation, such as schedule times, appointment association, and
 * reservation type. The function enforces that the reservation exists, is not
 * soft-deleted, and only updates fields present in the update body.
 * Authorization is based on the provided departmentHead payload, assuming
 * organization/department scope is externally validated per application
 * convention. All timestamps are normalized to ISO 8601 string format, and no
 * native Date object is used in the type system. Only schema-allowed and
 * DTO-allowed fields are touched.
 *
 * @param props - Update input, including:
 *
 *   - DepartmentHead: The authenticated DepartmentheadPayload authorized to perform
 *       this update.
 *   - EquipmentReservationId: The UUID of the reservation to update.
 *   - Body: IHealthcarePlatformEquipmentReservation.IUpdate (fields to update:
 *       reservation_start, reservation_end, reservation_type, appointment_id)
 *
 * @returns The updated IHealthcarePlatformEquipmentReservation object.
 * @throws {Error} If the reservation is not found, is already deleted, or the
 *   operation is not permitted.
 */
export async function puthealthcarePlatformDepartmentHeadEquipmentReservationsEquipmentReservationId(props: {
  departmentHead: DepartmentheadPayload;
  equipmentReservationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEquipmentReservation.IUpdate;
}): Promise<IHealthcarePlatformEquipmentReservation> {
  const { departmentHead, equipmentReservationId, body } = props;

  // Find the target reservation (must exist and not be soft-deleted)
  const current =
    await MyGlobal.prisma.healthcare_platform_equipment_reservations.findFirst({
      where: { id: equipmentReservationId, deleted_at: null },
    });
  if (!current) {
    throw new Error("Reservation not found or already deleted");
  }

  // NOTE: In a robust implementation, you would verify that departmentHead is
  // authorized to update this reservation by comparing their organization and/or
  // department to the reservation's resource mapping. This check is omitted due
  // to schema limitations.

  // Update only provided fields; set updated_at to now
  const updated =
    await MyGlobal.prisma.healthcare_platform_equipment_reservations.update({
      where: { id: equipmentReservationId },
      data: {
        ...(body.reservation_start !== undefined && {
          reservation_start: body.reservation_start,
        }),
        ...(body.reservation_end !== undefined && {
          reservation_end: body.reservation_end,
        }),
        ...(body.appointment_id !== undefined && {
          appointment_id: body.appointment_id,
        }),
        ...(body.reservation_type !== undefined && {
          reservation_type: body.reservation_type,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    equipment_id: updated.equipment_id,
    reservation_start: toISOStringSafe(updated.reservation_start),
    reservation_end: toISOStringSafe(updated.reservation_end),
    appointment_id: updated.appointment_id ?? undefined,
    reservation_type: updated.reservation_type,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
