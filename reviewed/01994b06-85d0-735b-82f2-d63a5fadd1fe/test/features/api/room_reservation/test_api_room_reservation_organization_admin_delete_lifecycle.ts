import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";

/**
 * End-to-end test: Organization admin can soft-delete a room reservation, and
 * deletion lifecyle behaves as expected.
 *
 * Steps:
 *
 * 1. Register organization admin (join)
 * 2. Log in as admin
 * 3. Admin creates a room reservation (for a made-up room and org)
 * 4. Admin deletes (soft-deletes) the reservation
 * 5. Create a new reservation with same room/time (should succeed -- no conflict
 *    due to prior soft-deleted reservation)
 * 6. Attempt to delete non-existent reservation (should error)
 * 7. Attempt to delete already deleted reservation (should error)
 */
export async function test_api_room_reservation_organization_admin_delete_lifecycle(
  connection: api.IConnection,
) {
  // 1. Register an organization admin
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        password: "SecretPassword!1",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);
  const organizationId = adminJoin.id satisfies string as string;

  // 2. Log in as organization admin
  const adminAuth = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminJoin.email,
        password: "SecretPassword!1",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminAuth);

  // 3. Organization admin creates a new room reservation
  const roomId = typia.random<string & tags.Format<"uuid">>();
  const reservationStart = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const reservationEnd = new Date(
    Date.now() + 2 * 60 * 60 * 1000,
  ).toISOString();
  const reservationType = "appointment";

  const createBody = {
    healthcare_platform_organization_id: organizationId,
    room_id: roomId,
    reservation_start: reservationStart,
    reservation_end: reservationEnd,
    reservation_type: reservationType,
  } satisfies IHealthcarePlatformRoomReservation.ICreate;

  const reservation =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
      connection,
      { body: createBody },
    );
  typia.assert(reservation);

  // 4. Admin deletes (soft-deletes) the reservation
  await api.functional.healthcarePlatform.organizationAdmin.roomReservations.erase(
    connection,
    { roomReservationId: reservation.id },
  );
  // Since no GET endpoint, cannot verify deleted_at property directly.
  // Indirectly verify: Should be able to create a new reservation for same time/room.

  // 5. Create a new reservation with same room/time (should succeed, meaning previous reservation is considered deleted)
  const reservation2 =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
      connection,
      { body: createBody },
    );
  typia.assert(reservation2);
  TestValidator.notEquals(
    "new reservation id differs from soft-deleted one",
    reservation2.id,
    reservation.id,
  );
  TestValidator.equals(
    "organization id remains the same",
    reservation2.healthcare_platform_organization_id,
    organizationId,
  );
  TestValidator.equals(
    "room id remains the same",
    reservation2.room_id,
    roomId,
  );

  // 6. Attempt to delete a non-existent reservation
  await TestValidator.error(
    "delete non-existent reservation fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.roomReservations.erase(
        connection,
        { roomReservationId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );

  // 7. Attempt to delete already deleted reservation
  await TestValidator.error(
    "delete already deleted reservation fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.roomReservations.erase(
        connection,
        { roomReservationId: reservation.id },
      );
    },
  );
}
