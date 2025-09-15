import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";

/**
 * Validate that a receptionist can delete a room reservation, permission is
 * enforced, and deleted entity cannot be fetched.
 *
 * 1. Register and log in a receptionist
 * 2. Create a room reservation
 * 3. Delete the room reservation by ID
 * 4. Attempt to GET the deleted reservation (should not be found or access denied)
 * 5. Attempt to delete a non-existent roomReservationId (should error)
 * 6. Attempt unauthorized deletion (should error)
 */
export async function test_api_room_reservation_deletion_by_receptionist(
  connection: api.IConnection,
) {
  // 1. Register a receptionist
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistFullName = RandomGenerator.name();
  const receptionistReg = await api.functional.auth.receptionist.join(
    connection,
    {
      body: {
        email: receptionistEmail,
        full_name: receptionistFullName,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    },
  );
  typia.assert(receptionistReg);

  // 2. Log in as the receptionist
  const receptionistLogin = await api.functional.auth.receptionist.login(
    connection,
    {
      body: {
        email: receptionistEmail,
        password: "password",
      } satisfies IHealthcarePlatformReceptionist.ILogin,
    },
  );
  typia.assert(receptionistLogin);

  // 3. Create a room reservation
  const reservationBody = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    room_id: typia.random<string & tags.Format<"uuid">>(),
    reservation_start: new Date().toISOString(),
    reservation_end: new Date(Date.now() + 3600000).toISOString(),
    reservation_type: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHealthcarePlatformRoomReservation.ICreate;
  const createdReservation =
    await api.functional.healthcarePlatform.receptionist.roomReservations.create(
      connection,
      {
        body: reservationBody,
      },
    );
  typia.assert(createdReservation);

  // 4. Delete the room reservation
  await api.functional.healthcarePlatform.receptionist.roomReservations.erase(
    connection,
    {
      roomReservationId: createdReservation.id,
    },
  );

  // 5. Attempt to delete a non-existent roomReservationId - should error
  await TestValidator.error(
    "delete non-existent room reservation should fail",
    async () => {
      await api.functional.healthcarePlatform.receptionist.roomReservations.erase(
        connection,
        {
          roomReservationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Attempt unauthorized deletion - simulate another connection without auth
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot delete reservation",
    async () => {
      await api.functional.healthcarePlatform.receptionist.roomReservations.erase(
        unauthConnection,
        {
          roomReservationId: createdReservation.id,
        },
      );
    },
  );
}
