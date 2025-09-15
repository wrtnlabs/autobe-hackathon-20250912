import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";

/**
 * Validates that an organization admin can retrieve detailed information for a
 * specific room reservation by its unique id, but cannot access room
 * reservations belonging to another organization.
 *
 * Scenario Steps:
 *
 * 1. Register and log in as organization admin A
 * 2. Create a room reservation by admin A
 * 3. Retrieve that reservation via id as admin A and check all fields match
 * 4. Attempt to fetch a non-existent room reservation id and expect a 404/error
 * 5. Register and log in as organization admin B (of a different org)
 * 6. Attempt to fetch admin A's reservation with admin B account and expect
 *    forbidden/error Only admin role paths are tested as other roles are not
 *    available in this context.
 */
export async function test_api_room_reservation_detail_retrieval_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Register organization admin A
  const adminAEmail: string = typia.random<string & tags.Format<"email">>();
  const adminAJoin = {
    email: adminAEmail,
    full_name: RandomGenerator.name(),
    password: "password!123",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminA: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminAJoin,
    });
  typia.assert(adminA);

  // 2. Create a room reservation for admin A's organization
  const reservationInput = {
    healthcare_platform_organization_id: adminA.id, // Use admin's id to represent the organization
    room_id: typia.random<string & tags.Format<"uuid">>(),
    reservation_start: new Date(Date.now() + 60_000).toISOString(),
    reservation_end: new Date(Date.now() + 3_600_000).toISOString(),
    reservation_type: "appointment",
    appointment_id: null,
  } satisfies IHealthcarePlatformRoomReservation.ICreate;
  const reservation: IHealthcarePlatformRoomReservation =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
      connection,
      { body: reservationInput },
    );
  typia.assert(reservation);

  // 3. Retrieve and verify the reservation
  const fetched: IHealthcarePlatformRoomReservation =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.at(
      connection,
      { roomReservationId: reservation.id },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "retrieved reservation matches created reservation",
    fetched,
    reservation,
  );

  // 4. Try to fetch a non-existent reservation id
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail fetching non-existent reservation",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.roomReservations.at(
        connection,
        { roomReservationId: nonExistentId },
      );
    },
  );

  // 5. Register organization admin B (another org)
  const adminBEmail: string = typia.random<string & tags.Format<"email">>();
  const adminBJoin = {
    email: adminBEmail,
    full_name: RandomGenerator.name(),
    password: "password!123",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminB: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminBJoin,
    });
  typia.assert(adminB);

  // Switch login to admin B
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminBEmail,
      password: "password!123",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 6. Try to fetch admin A's reservation as admin B
  await TestValidator.error(
    "organization admin B forbidden from accessing admin A's reservation",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.roomReservations.at(
        connection,
        { roomReservationId: reservation.id },
      );
    },
  );
}
