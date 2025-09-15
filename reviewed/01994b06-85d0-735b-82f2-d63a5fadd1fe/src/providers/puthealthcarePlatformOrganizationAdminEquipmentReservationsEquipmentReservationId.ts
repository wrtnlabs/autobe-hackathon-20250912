import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing equipment reservation record
 * (healthcare_platform_equipment_reservations table) by identifier.
 *
 * Allows authorized organization administrators to update reservation details
 * such as start/end time, appointment linkage, and reservation type. Strictly
 * enforces organization boundaries, ensures the target reservation is active
 * and not soft-deleted, and enforces business logic and auditability for
 * linkage with appointments. Validates proper linkage and prevents modification
 * of records outside the admin's organization or that are archived.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization administrator
 *   performing the update
 * @param props.equipmentReservationId - The unique identifier of the
 *   reservation to update
 * @param props.body - Fields to update in the reservation (any combination of
 *   reservation_start, reservation_end, appointment_id, reservation_type)
 * @returns The updated reservation with all fields populated in the strict API
 *   response format.
 * @throws {Error} If the reservation does not exist, is deleted, not in the
 *   admin's org, or if appointment_id linkage is invalid.
 */
export async function puthealthcarePlatformOrganizationAdminEquipmentReservationsEquipmentReservationId(props: {
  organizationAdmin: OrganizationadminPayload;
  equipmentReservationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEquipmentReservation.IUpdate;
}): Promise<IHealthcarePlatformEquipmentReservation> {
  const { organizationAdmin, equipmentReservationId, body } = props;

  // 1. Load and validate the target equipment reservation
  const reservation =
    await MyGlobal.prisma.healthcare_platform_equipment_reservations.findFirst({
      where: {
        id: equipmentReservationId,
        deleted_at: null,
      },
    });
  if (!reservation) {
    throw new Error("Reservation does not exist or has been archived.");
  }

  // 2. Load the admin's organization context (by joining user_org_assignments)
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        deleted_at: null,
      },
      select: {
        healthcare_platform_organization_id: true,
      },
    });
  if (!orgAssignment) {
    throw new Error(
      "Authenticated organization admin must be assigned to at least one organization.",
    );
  }

  // 3. Authorization: Only allow update if reservation is in admin's organization
  if (
    reservation.healthcare_platform_organization_id !==
    orgAssignment.healthcare_platform_organization_id
  ) {
    throw new Error("You are not authorized to update this reservation.");
  }

  // 4. If updating appointment_id (explicitly present), validate linkage
  if (body.appointment_id !== undefined) {
    if (body.appointment_id !== null) {
      const appointment =
        await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
          where: {
            id: body.appointment_id,
            healthcare_platform_organization_id:
              reservation.healthcare_platform_organization_id,
            deleted_at: null,
          },
        });
      if (!appointment) {
        throw new Error(
          "Linked appointment does not exist or does not belong to this organization.",
        );
      }
    }
  }

  // 5. Apply the update, allow only updatable fields
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_equipment_reservations.update({
      where: { id: equipmentReservationId },
      data: {
        reservation_start: body.reservation_start ?? undefined,
        reservation_end: body.reservation_end ?? undefined,
        appointment_id:
          body.appointment_id !== undefined ? body.appointment_id : undefined,
        reservation_type: body.reservation_type ?? undefined,
        updated_at: now,
      },
    });

  // 6. Return API DTO-formatted object
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    equipment_id: updated.equipment_id,
    reservation_start: toISOStringSafe(updated.reservation_start),
    reservation_end: toISOStringSafe(updated.reservation_end),
    appointment_id:
      updated.appointment_id === null || updated.appointment_id === undefined
        ? null
        : updated.appointment_id,
    reservation_type: updated.reservation_type,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== undefined && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
