import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates system admin creation of a new room reservation record, permission
 * boundaries, required fields, and business integrity rules.
 *
 * Steps:
 *
 * 1. Register and authenticate a system admin
 * 2. Generate valid organization/room/appointment UUIDs (simulating real
 *    relations)
 * 3. Create a valid room reservation as the system admin
 * 4. Assert the reservation is persisted and matches input
 * 5. Attempt to double-book the same room and window (should fail)
 */
export async function test_api_room_reservation_creation_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register/authenticate system admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Generate related IDs
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const roomId = typia.random<string & tags.Format<"uuid">>();
  const appointmentId = typia.random<string & tags.Format<"uuid">>();

  // Valid time window (now + 1h to now + 2h)
  const now = new Date();
  const reservationStart = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString();
  const reservationEnd = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString();

  // 3. Create a valid reservation (should succeed)
  const createBody = {
    healthcare_platform_organization_id: organizationId,
    room_id: roomId,
    reservation_start: reservationStart,
    reservation_end: reservationEnd,
    reservation_type: "appointment",
    appointment_id: appointmentId,
  } satisfies IHealthcarePlatformRoomReservation.ICreate;
  const reservation =
    await api.functional.healthcarePlatform.systemAdmin.roomReservations.create(
      connection,
      { body: createBody },
    );
  typia.assert(reservation);
  TestValidator.equals(
    "healthcare_platform_organization_id",
    reservation.healthcare_platform_organization_id,
    organizationId,
  );
  TestValidator.equals("room_id", reservation.room_id, roomId);
  TestValidator.equals(
    "reservation_type",
    reservation.reservation_type,
    "appointment",
  );
  TestValidator.equals(
    "appointment_id",
    reservation.appointment_id,
    appointmentId,
  );

  // 4. Double-booking: same room, overlapping window (should fail)
  await TestValidator.error("room double-booking prevented", async () => {
    await api.functional.healthcarePlatform.systemAdmin.roomReservations.create(
      connection,
      { body: createBody },
    );
  });
}
