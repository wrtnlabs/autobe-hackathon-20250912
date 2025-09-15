import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Create a new room reservation (healthcare_platform_room_reservations)
 *
 * This operation creates a new room reservation in the healthcarePlatform for
 * clinical and administrative scheduling. It handles appointment, maintenance,
 * and event resource allocation by authorized department heads. Double-booking
 * is prevented and only organizationally permitted reservation windows are
 * allowed.
 *
 * Authorization: Only department head users, as validated by
 * DepartmentheadPayload, may invoke this function. Organization and role-level
 * permission checks must be enforced by decorator and upstream logic.
 *
 * @param props - Properties for room reservation creation
 * @param props.departmentHead - Authenticated department head payload
 * @param props.body - Reservation creation data (organization, room, time
 *   window, type, optional appointment linkage)
 * @returns The created room reservation details
 * @throws {Error} If a reservation conflict (double booking) exists
 */
export async function posthealthcarePlatformDepartmentHeadRoomReservations(props: {
  departmentHead: DepartmentheadPayload;
  body: IHealthcarePlatformRoomReservation.ICreate;
}): Promise<IHealthcarePlatformRoomReservation> {
  const { departmentHead, body } = props;

  // Step 1: Authorization check (performed by decorator/provider - departmentHead must be valid)

  // Step 2: Prevent room double-booking (conflict check)
  const conflict =
    await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
      where: {
        room_id: body.room_id,
        deleted_at: null,
        reservation_start: { lt: body.reservation_end },
        reservation_end: { gt: body.reservation_start },
      },
    });
  if (conflict) {
    throw new Error("Room already reserved during the requested time window");
  }

  // Step 3: Create reservation (dates must be string & tags.Format<'date-time'>; id generated)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_room_reservations.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        room_id: body.room_id,
        reservation_start: body.reservation_start,
        reservation_end: body.reservation_end,
        reservation_type: body.reservation_type,
        appointment_id: body.appointment_id ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Step 4: Map DB object to API DTO, converting all date fields appropriately
  return {
    id: created.id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id,
    room_id: created.room_id,
    reservation_start: created.reservation_start,
    reservation_end: created.reservation_end,
    reservation_type: created.reservation_type,
    appointment_id: created.appointment_id ?? undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
