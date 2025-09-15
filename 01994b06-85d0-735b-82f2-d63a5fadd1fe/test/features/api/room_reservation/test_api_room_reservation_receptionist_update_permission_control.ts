import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";

/**
 * Test that only a receptionist can update their own room reservation, and
 * permission is denied if a receptionist tries to update a reservation from
 * another organization.
 *
 * 1. Register Receptionist A (OrgA), Receptionist B (OrgB), and log in as A.
 * 2. Receptionist A creates a reservation (resA_1) for OrgA.
 * 3. Receptionist A updates reservation resA_1.
 *
 * - Verify audit fields (updated_at) and updated values persist.
 *
 * 4. Receptionist B logs in and tries to update resA_1—should be denied.
 */
export async function test_api_room_reservation_receptionist_update_permission_control(
  connection: api.IConnection,
) {
  // 1. Register Receptionist A & B, login as A
  const receptionistAInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const receptionistBInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;

  // Receptionist A registration & login
  const receptionistA = await api.functional.auth.receptionist.join(
    connection,
    { body: receptionistAInfo },
  );
  typia.assert(receptionistA);

  // Organization id for reservation (randomized in absence of relationship API)
  const organizationIdA = typia.random<string & tags.Format<"uuid">>();

  // Receptionist B registration
  const receptionistB = await api.functional.auth.receptionist.join(
    connection,
    { body: receptionistBInfo },
  );
  typia.assert(receptionistB);

  // Receptionist A login
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistAInfo.email,
      password: "password",
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 2. Receptionist A creates a reservation for her org
  const createRoomReservationInput = {
    healthcare_platform_organization_id: organizationIdA,
    room_id: typia.random<string & tags.Format<"uuid">>(),
    reservation_start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    reservation_end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    reservation_type: RandomGenerator.paragraph({ sentences: 1 }),
    appointment_id: null,
  } satisfies IHealthcarePlatformRoomReservation.ICreate;

  const createdReservation =
    await api.functional.healthcarePlatform.receptionist.roomReservations.create(
      connection,
      { body: createRoomReservationInput },
    );
  typia.assert(createdReservation);
  TestValidator.equals(
    "created res org id",
    createdReservation.healthcare_platform_organization_id,
    organizationIdA,
  );

  // 3. Receptionist A updates her own reservation
  const newRoomId = typia.random<string & tags.Format<"uuid">>();
  const updateInput = {
    room_id: newRoomId,
    reservation_type: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IHealthcarePlatformRoomReservation.IUpdate;

  const updatedReservation =
    await api.functional.healthcarePlatform.receptionist.roomReservations.update(
      connection,
      {
        roomReservationId: createdReservation.id,
        body: updateInput,
      },
    );
  typia.assert(updatedReservation);
  TestValidator.equals(
    "room id updated",
    updatedReservation.room_id,
    newRoomId,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedReservation.updated_at,
    createdReservation.updated_at,
  );
  // Should retain same id
  TestValidator.equals(
    "id unchanged",
    updatedReservation.id,
    createdReservation.id,
  );

  // 4. Receptionist B login & attempts forbidden update
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistBInfo.email,
      password: "password",
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });
  const forbiddenUpdateInput = {
    reservation_type: "Should not work",
  } satisfies IHealthcarePlatformRoomReservation.IUpdate;
  await TestValidator.error(
    "permission denied for updating foreign reservation",
    async () => {
      await api.functional.healthcarePlatform.receptionist.roomReservations.update(
        connection,
        {
          roomReservationId: createdReservation.id,
          body: forbiddenUpdateInput,
        },
      );
    },
  );
}
