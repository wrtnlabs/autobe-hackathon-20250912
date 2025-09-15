import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E test for room reservation deletion by system admin. Validates the join,
 * login, create, delete flow, and error handling for repeated and not-found
 * deletions.
 *
 * Steps:
 *
 * 1. Register system admin and login.
 * 2. Create a room reservation.
 * 3. Delete the reservation.
 * 4. Try to delete again (expect error).
 * 5. Try to delete a random, non-existent reservation (expect error).
 */
export async function test_api_room_reservation_deletion_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Login as system admin (ensures token is set)
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Create a new room reservation
  const createBody = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    room_id: typia.random<string & tags.Format<"uuid">>(),
    reservation_start: new Date(Date.now() + 60_000).toISOString(),
    reservation_end: new Date(Date.now() + 3_600_000).toISOString(),
    reservation_type: RandomGenerator.pick([
      "appointment",
      "admin",
      "cleaning",
      "maintenance",
    ] as const),
  } satisfies IHealthcarePlatformRoomReservation.ICreate;
  const reservation =
    await api.functional.healthcarePlatform.systemAdmin.roomReservations.create(
      connection,
      { body: createBody },
    );
  typia.assert(reservation);
  TestValidator.equals(
    "reservation organization ID",
    reservation.healthcare_platform_organization_id,
    createBody.healthcare_platform_organization_id,
  );
  TestValidator.equals(
    "reservation room ID",
    reservation.room_id,
    createBody.room_id,
  );

  // 4. Delete the reservation
  await api.functional.healthcarePlatform.systemAdmin.roomReservations.erase(
    connection,
    { roomReservationId: reservation.id },
  );

  // 5. Try to delete the same reservation again (should error)
  await TestValidator.error(
    "re-deleting deleted reservation should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.roomReservations.erase(
        connection,
        { roomReservationId: reservation.id },
      );
    },
  );

  // 6. Try to delete a non-existent reservation (should error)
  const randomUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete unknown reservation should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.roomReservations.erase(
        connection,
        { roomReservationId: randomUUID },
      );
    },
  );
}
