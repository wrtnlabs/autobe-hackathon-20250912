import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";

/**
 * E2E test for department head deleting a room reservation.
 *
 * Steps:
 *
 * 1. Register a department head (join)
 * 2. Login as the department head
 * 3. Create a room reservation
 * 4. Delete the room reservation (success: owned, authenticated)
 * 5. Attempt to delete the same reservation again (should trigger error)
 * 6. Attempt to delete a non-existing reservation (should trigger error)
 * 7. (Optional, if APIs supported) Attempt deletion as a different head;
 *    omitted since alternate login context is not exposed
 */
export async function test_api_room_reservation_deletion_by_department_head(
  connection: api.IConnection,
) {
  // 1. Register department head
  const email = typia.random<string & tags.Format<"email">>();
  const fullName = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(10);
  const joinBody = {
    email,
    full_name: fullName,
    password,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const auth: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: joinBody,
    });
  typia.assert(auth);

  // 2. Login (refresh auth context)
  const loginBody = {
    email,
    password,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const login: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.login(connection, {
      body: loginBody,
    });
  typia.assert(login);

  // 3. Create a room reservation
  const reservationBody = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    room_id: typia.random<string & tags.Format<"uuid">>(),
    reservation_start: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    reservation_end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    reservation_type: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IHealthcarePlatformRoomReservation.ICreate;
  const reservation: IHealthcarePlatformRoomReservation =
    await api.functional.healthcarePlatform.departmentHead.roomReservations.create(
      connection,
      { body: reservationBody },
    );
  typia.assert(reservation);

  // 4. Delete the room reservation
  await api.functional.healthcarePlatform.departmentHead.roomReservations.erase(
    connection,
    {
      roomReservationId: reservation.id,
    },
  );
  // 5. Attempt to delete same reservation again: error expected
  await TestValidator.error("double deletion should fail", async () => {
    await api.functional.healthcarePlatform.departmentHead.roomReservations.erase(
      connection,
      {
        roomReservationId: reservation.id,
      },
    );
  });
  // 6. Attempt to delete a non-existing reservation: error expected
  await TestValidator.error(
    "deletion of non-existent reservation should fail",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.roomReservations.erase(
        connection,
        {
          roomReservationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
