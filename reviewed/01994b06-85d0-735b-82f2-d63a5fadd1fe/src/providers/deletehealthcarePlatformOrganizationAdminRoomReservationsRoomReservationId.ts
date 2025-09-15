import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Deletes a room reservation (soft-delete semantics).
 *
 * This operation marks the specified room reservation as deleted by setting its
 * 'deleted_at' column. Only accessible to organization admins. All actions are
 * fully audit-logged. If the reservation does not exist or is already deleted,
 * a 404 error is thrown.
 *
 * @param props - Object containing the organization admin payload and room
 *   reservation id
 * @param props.organizationAdmin - Authenticated organization admin (role
 *   enforced by controller)
 * @param props.roomReservationId - UUID of the room reservation to delete
 * @returns Void
 * @throws Error if reservation does not exist or is already deleted
 */
export async function deletehealthcarePlatformOrganizationAdminRoomReservationsRoomReservationId(props: {
  organizationAdmin: OrganizationadminPayload;
  roomReservationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, roomReservationId } = props;

  // Step 1: Find the reservation, enforce not already deleted
  const reservation =
    await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
      where: {
        id: roomReservationId,
        deleted_at: null,
      },
    });
  if (reservation === null) {
    throw new Error("Reservation not found");
  }
  // Step 2: Set deleted_at (soft-delete)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_room_reservations.update({
    where: { id: roomReservationId },
    data: { deleted_at: now },
  });
  // Step 3: Write audit log
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: organizationAdmin.id,
      organization_id: reservation.healthcare_platform_organization_id,
      action_type: "DELETE",
      event_context: null,
      ip_address: null,
      related_entity_type: "room_reservation",
      related_entity_id: roomReservationId,
      created_at: now,
    },
  });
}
