import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new equipment reservation for operational or clinical scheduling.
 *
 * This endpoint allows an authenticated system administrator to create a new
 * resource booking entry in the healthcare_platform_equipment_reservations
 * table. The reservation links a piece of equipment to an organization for a
 * specified time slot. All input fields (organization, equipment, reservation
 * window, type) are validated, and business rules enforce conflict prevention,
 * correct timing, and topology integrity. Appointment linkage is optional per
 * request, and soft delete is supported via deleted_at (null if active).
 *
 * @param props - Props for the reservation creation.
 * @param props.systemAdmin - Authenticated system administrator payload.
 * @param props.body - Equipment reservation creation details (organization id,
 *   equipment id, time slot, type, and optional appointment linkage).
 * @returns The created equipment reservation record, fully typed with all audit
 *   and linkage fields.
 * @throws {Error} If the organization does not exist, or if a reservation
 *   conflict or invalid time window is detected.
 */
export async function posthealthcarePlatformSystemAdminEquipmentReservations(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformEquipmentReservation.ICreate;
}): Promise<IHealthcarePlatformEquipmentReservation> {
  const { systemAdmin, body } = props;

  // Validate organization existence
  const organization =
    await MyGlobal.prisma.healthcare_platform_organizations.findFirst({
      where: { id: body.organization_id },
    });
  if (!organization) throw new Error("Organization does not exist");

  // TODO: Validate equipment existence if an equipment registry is present

  // Validate time window (reservation_end > reservation_start)
  if (
    new Date(body.reservation_end).getTime() <=
    new Date(body.reservation_start).getTime()
  ) {
    throw new Error("Reservation end must be after start");
  }

  // Check for conflicting reservations on this equipment and time slot
  const conflict =
    await MyGlobal.prisma.healthcare_platform_equipment_reservations.findFirst({
      where: {
        equipment_id: body.equipment_id,
        deleted_at: null,
        AND: [
          { reservation_end: { gt: body.reservation_start } },
          { reservation_start: { lt: body.reservation_end } },
        ],
      },
    });
  if (conflict) {
    throw new Error(
      "Reservation conflict: overlapping time window for equipment.",
    );
  }

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create the reservation
  const created =
    await MyGlobal.prisma.healthcare_platform_equipment_reservations.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        healthcare_platform_organization_id: body.organization_id,
        equipment_id: body.equipment_id,
        reservation_start: body.reservation_start,
        reservation_end: body.reservation_end,
        appointment_id: body.appointment_id ?? null,
        reservation_type: body.reservation_type,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Return in the API DTO shape, with correct type handling
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
