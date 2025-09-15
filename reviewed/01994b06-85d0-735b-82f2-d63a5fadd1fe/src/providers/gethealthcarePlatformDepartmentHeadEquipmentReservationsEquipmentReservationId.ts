import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve a single equipment reservation's details by its unique identifier
 * (from healthcare_platform_equipment_reservations table).
 *
 * This function retrieves the details of a specific equipment reservation
 * identified by its equipmentReservationId. It ensures that the requesting
 * department head exists and is active, and that the reservation is not
 * deleted. Optionally, if RBAC (organization-scoped) can be enforced, it checks
 * that the department head belongs to the same organization as the reservation.
 * All relevant reservation fields are returned with proper date-time
 * formatting.
 *
 * Authorization: Only accessible to department heads active in the system.
 *
 * @param props - Function props with departmentHead auth payload and the
 *   reservation id
 * @param props.departmentHead - The authenticated department head making this
 *   request
 * @param props.equipmentReservationId - The equipment reservation's unique id
 *   (UUID)
 * @returns Complete reservation details for workflow/status/audit needs
 * @throws {Error} If reservation does not exist or is deleted
 * @throws {Error} If department head does not exist or is deleted
 * @throws {Error} If RBAC enforcement fails (not same org), when org linkage is
 *   possible
 */
export async function gethealthcarePlatformDepartmentHeadEquipmentReservationsEquipmentReservationId(props: {
  departmentHead: DepartmentheadPayload;
  equipmentReservationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformEquipmentReservation> {
  const { departmentHead, equipmentReservationId } = props;
  // Lookup: active, not-deleted equipment reservation by UUID
  const reservation =
    await MyGlobal.prisma.healthcare_platform_equipment_reservations.findFirst({
      where: {
        id: equipmentReservationId,
        deleted_at: null,
      },
    });
  if (reservation === null)
    throw new Error("Reservation not found or already deleted");

  // Lookup: department head user and validate not deleted
  const departmentHeadUser =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
      where: {
        id: departmentHead.id,
        deleted_at: null,
      },
    });
  if (departmentHeadUser === null)
    throw new Error("Department head not found or deleted");
  // NOTE: Robust org-level RBAC enforcement depends on department head org linkage,
  // which is not in this schema cut. In full schema, should check org association.

  // All date(s) must be properly formatted as string & tags.Format<'date-time'>
  return {
    id: reservation.id,
    healthcare_platform_organization_id:
      reservation.healthcare_platform_organization_id,
    equipment_id: reservation.equipment_id,
    reservation_start: toISOStringSafe(reservation.reservation_start),
    reservation_end: toISOStringSafe(reservation.reservation_end),
    appointment_id:
      reservation.appointment_id !== undefined &&
      reservation.appointment_id !== null
        ? reservation.appointment_id
        : undefined,
    reservation_type: reservation.reservation_type,
    created_at: toISOStringSafe(reservation.created_at),
    updated_at: toISOStringSafe(reservation.updated_at),
    deleted_at:
      reservation.deleted_at !== undefined && reservation.deleted_at !== null
        ? toISOStringSafe(reservation.deleted_at)
        : undefined,
  };
}
