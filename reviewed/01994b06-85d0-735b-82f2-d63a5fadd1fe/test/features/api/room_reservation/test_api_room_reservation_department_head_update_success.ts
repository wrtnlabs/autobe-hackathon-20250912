import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";

/**
 * Test full workflow where a department head updates a room reservation with
 * valid data including changing room, time, and appointment linkage.
 *
 * 1. Register as department head
 * 2. Login as department head
 * 3. Generate room_id and appointment_id as uuid strings
 * 4. Create a room reservation with initial values
 * 5. Update the reservation with new date/time, new room_id, and new
 *    appointment_id
 * 6. Check that the update was successful: updated fields match, audit fields
 *    updated, history consistent
 */
export async function test_api_room_reservation_department_head_update_success(
  connection: api.IConnection,
) {
  // 1. Register as department head
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    full_name: RandomGenerator.name(),
    password,
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const head = await api.functional.auth.departmentHead.join(connection, {
    body: joinBody,
  });
  typia.assert(head);

  // 2. Login as department head
  const loginBody = {
    email,
    password,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const session = await api.functional.auth.departmentHead.login(connection, {
    body: loginBody,
  });
  typia.assert(session);

  // Use department head org id for reservation creation
  // 3. Generate room_id and appointment_id
  const initialRoomId = typia.random<string & tags.Format<"uuid">>();
  const initialAppointmentId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const startInitial = new Date(now.getTime() + 3600 * 1000).toISOString(); // 1 hour from now
  const endInitial = new Date(now.getTime() + 7200 * 1000).toISOString(); // 2 hours from now

  // 4. Create room reservation
  const createBody = {
    healthcare_platform_organization_id: head.id,
    room_id: initialRoomId,
    reservation_start: startInitial,
    reservation_end: endInitial,
    reservation_type: RandomGenerator.pick([
      "appointment",
      "cleaning",
      "maintenance",
      "admin",
    ] as const),
    appointment_id: initialAppointmentId,
  } satisfies IHealthcarePlatformRoomReservation.ICreate;
  const reservation =
    await api.functional.healthcarePlatform.departmentHead.roomReservations.create(
      connection,
      { body: createBody },
    );
  typia.assert(reservation);

  // Save created_at for later comparison
  const createdAt = reservation.created_at;

  // 5. Prepare update: Change room, new start/end, new type, link different appointment
  const newRoomId = typia.random<string & tags.Format<"uuid">>();
  const newAppointmentId = typia.random<string & tags.Format<"uuid">>();
  const newStart = new Date(now.getTime() + 10800 * 1000).toISOString(); // 3 hours from now
  const newEnd = new Date(now.getTime() + 14400 * 1000).toISOString(); // 4 hours from now
  const newType = RandomGenerator.pick([
    "appointment",
    "cleaning",
    "maintenance",
    "admin",
  ] as const);
  const updateBody = {
    room_id: newRoomId,
    reservation_start: newStart,
    reservation_end: newEnd,
    reservation_type: newType,
    appointment_id: newAppointmentId,
  } satisfies IHealthcarePlatformRoomReservation.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.departmentHead.roomReservations.update(
      connection,
      {
        roomReservationId: reservation.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 6. Check update
  TestValidator.equals("room_id updated", updated.room_id, newRoomId);
  TestValidator.equals(
    "reservation_start updated",
    updated.reservation_start,
    newStart,
  );
  TestValidator.equals(
    "reservation_end updated",
    updated.reservation_end,
    newEnd,
  );
  TestValidator.equals(
    "reservation_type updated",
    updated.reservation_type,
    newType,
  );
  TestValidator.equals(
    "appointment_id updated",
    updated.appointment_id,
    newAppointmentId,
  );
  TestValidator.equals("ID unchanged", updated.id, reservation.id);
  TestValidator.equals(
    "organization unchanged",
    updated.healthcare_platform_organization_id,
    head.id,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    reservation.updated_at,
  );
  TestValidator.equals("created_at unchanged", updated.created_at, createdAt);
  // deleted_at should remain null/undefined
  TestValidator.equals("not deleted", updated.deleted_at ?? null, null);
}
