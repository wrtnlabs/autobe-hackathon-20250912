import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new equipment reservation for operational or clinical scheduling.
 *
 * Allows an authorized organization administrator to create a reservation for
 * technical/medical equipment. Performs strict RBAC: the admin can only create
 * reservations for equipment in their own organization. Checks for conflicting
 * reservations (overlap on time slot for same equipment, not deleted). Converts
 * all timestamps to ISO date strings with typia branding.
 *
 * @param props.organizationAdmin - Authenticated organization administrator
 * @param props.body - Equipment reservation creation request
 *   (org/equipment/resource interval/type)
 * @returns Fully populated reservation record upon success
 * @throws {Error} If RBAC fails or time slot conflict exists.
 */
export async function posthealthcarePlatformOrganizationAdminEquipmentReservations(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformEquipmentReservation.ICreate;
}): Promise<IHealthcarePlatformEquipmentReservation> {
  const { organizationAdmin, body } = props;

  // RBAC: Only allow admin to reserve for their own org
  if (organizationAdmin.id !== body.organization_id) {
    throw new Error(
      "Forbidden: cannot create reservation for another organization",
    );
  }

  // Ensure input times are ISO strings (also ensures typia constraint)
  const reservationStart = toISOStringSafe(body.reservation_start);
  const reservationEnd = toISOStringSafe(body.reservation_end);

  // Business rule: disallow time slot overlap for same equipment
  const conflict =
    await MyGlobal.prisma.healthcare_platform_equipment_reservations.findFirst({
      where: {
        equipment_id: body.equipment_id,
        deleted_at: null,
        reservation_start: { lt: reservationEnd },
        reservation_end: { gt: reservationStart },
      },
    });
  if (conflict) {
    throw new Error("Schedule conflict detected for equipment and timeslot");
  }

  // Standard audit timestamp
  const now = toISOStringSafe(new Date());

  // Compose appointment_id based on user input pattern
  const appointmentId = body.appointment_id ?? undefined;

  // Create in database
  const created =
    await MyGlobal.prisma.healthcare_platform_equipment_reservations.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        healthcare_platform_organization_id: body.organization_id,
        equipment_id: body.equipment_id,
        reservation_start: reservationStart,
        reservation_end: reservationEnd,
        appointment_id: appointmentId,
        reservation_type: body.reservation_type,
        created_at: now,
        updated_at: now,
      },
    });

  // Compose return entity per API
  return {
    id: created.id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id,
    equipment_id: created.equipment_id,
    reservation_start: toISOStringSafe(created.reservation_start),
    reservation_end: toISOStringSafe(created.reservation_end),
    appointment_id: created.appointment_id ?? undefined,
    reservation_type: created.reservation_type,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
