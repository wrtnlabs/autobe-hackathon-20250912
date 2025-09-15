import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new room reservation (healthcare_platform_room_reservations)
 *
 * This endpoint allows an organization admin to create a room reservation for a
 * given organization and room, specifying a time window (start and end),
 * reservation type, and optional linkage to an appointment. Validation includes
 * checking for organization and appointment existence, and preventing
 * double-booking conflicts. Upon success, returns the full reservation details
 * for workflow and dashboard use.
 *
 * Only users with organization admin privileges can invoke this endpoint.
 * Authorization context is enforced via the OrganizationadminPayload injected
 * into props. If any validation fails (e.g., organization, appointment, or
 * double-booking conflict), the function throws an Error.
 *
 * @param props - Properties required to create a room reservation
 * @param props.organizationAdmin - Authenticated organization admin user
 *   context
 * @param props.body - Room reservation payload including organization ID, room
 *   ID, reservation times, type, and optional appointment
 * @returns The created room reservation record with all fields populated
 * @throws {Error} If organization, appointment, or referenced entities do not
 *   exist or a reservation conflict occurs
 */
export async function posthealthcarePlatformOrganizationAdminRoomReservations(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformRoomReservation.ICreate;
}): Promise<IHealthcarePlatformRoomReservation> {
  const { organizationAdmin, body } = props;

  // Validate organization exists and is active
  const org = await MyGlobal.prisma.healthcare_platform_organizations.findFirst(
    {
      where: {
        id: body.healthcare_platform_organization_id,
        deleted_at: null,
      },
    },
  );
  if (!org) {
    throw new Error("Organization not found");
  }

  // Validate double-booking (no overlapping reservation for this room & window)
  const overlapping =
    await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
      where: {
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        room_id: body.room_id,
        deleted_at: null,
        // Any overlap:
        reservation_start: { lt: body.reservation_end },
        reservation_end: { gt: body.reservation_start },
      },
    });
  if (overlapping) {
    throw new Error(
      "Room is already reserved for the specified time window (double-booking not allowed)",
    );
  }

  // If appointment_id present, validate appointment exists
  if (
    typeof body.appointment_id !== "undefined" &&
    body.appointment_id !== null
  ) {
    const appointment =
      await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
        where: { id: body.appointment_id },
      });
    if (!appointment) {
      throw new Error("Referenced appointment does not exist");
    }
  }

  // Reserve id and current timestamps
  const reservationId: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create reservation
  const created =
    await MyGlobal.prisma.healthcare_platform_room_reservations.create({
      data: {
        id: reservationId,
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        room_id: body.room_id,
        reservation_start: body.reservation_start,
        reservation_end: body.reservation_end,
        reservation_type: body.reservation_type,
        appointment_id:
          typeof body.appointment_id !== "undefined"
            ? body.appointment_id
            : undefined,
        created_at: now,
        updated_at: now,
      },
    });

  // Return DTO matching all schema/brand constraints
  return {
    id: created.id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id,
    room_id: created.room_id,
    reservation_start: created.reservation_start,
    reservation_end: created.reservation_end,
    reservation_type: created.reservation_type,
    appointment_id:
      typeof created.appointment_id !== "undefined"
        ? created.appointment_id
        : undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at:
      typeof created.deleted_at !== "undefined"
        ? created.deleted_at
        : undefined,
  };
}
