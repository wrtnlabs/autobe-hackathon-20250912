import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E test of a full system admin flow for updating room reservations: join
 * admin, login, create reservation, do a valid update, then attempt an
 * invalid/conflicting update and check error. Covers update of time window and
 * reservation_type, and expects conflict on overlapping times/room update.
 */
export async function test_api_room_reservation_system_admin_update_full_cycle(
  connection: api.IConnection,
) {
  // Step 1: Register a new system admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);
  // Step 2: Login as that system admin
  const loginOutput = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: joinInput.email,
      provider: joinInput.provider,
      provider_key: joinInput.provider_key,
      password: joinInput.password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginOutput);

  // Step 3: Prepare random/compatible organization and room ids (no create org/room API)
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const roomId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Create initial room reservation
  const start = new Date();
  const end = new Date(Date.now() + 60 * 60 * 1000);
  const createInput = {
    healthcare_platform_organization_id: organizationId,
    room_id: roomId,
    reservation_start: start.toISOString(),
    reservation_end: end.toISOString(),
    reservation_type: "appointment",
    appointment_id: null,
  } satisfies IHealthcarePlatformRoomReservation.ICreate;
  const createOutput =
    await api.functional.healthcarePlatform.systemAdmin.roomReservations.create(
      connection,
      {
        body: createInput,
      },
    );
  typia.assert(createOutput);

  // Step 5: Do a valid update—shift schedule and type
  const newStart = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
  const updateInput = {
    reservation_start: newStart.toISOString(),
    reservation_end: newEnd.toISOString(),
    reservation_type: "admin",
  } satisfies IHealthcarePlatformRoomReservation.IUpdate;
  const updateOutput =
    await api.functional.healthcarePlatform.systemAdmin.roomReservations.update(
      connection,
      {
        roomReservationId: createOutput.id,
        body: updateInput,
      },
    );
  typia.assert(updateOutput);
  TestValidator.equals(
    "updated start time",
    updateOutput.reservation_start,
    updateInput.reservation_start,
  );
  TestValidator.equals(
    "updated end time",
    updateOutput.reservation_end,
    updateInput.reservation_end,
  );
  TestValidator.equals(
    "updated reservation_type",
    updateOutput.reservation_type,
    updateInput.reservation_type,
  );

  // Step 6: Attempt a conflicting update (overlap with self on same room/time)
  await TestValidator.error(
    "conflicting update yields business error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.roomReservations.update(
        connection,
        {
          roomReservationId: createOutput.id,
          body: {
            room_id: roomId,
            reservation_start: start.toISOString(),
            reservation_end: end.toISOString(),
          } satisfies IHealthcarePlatformRoomReservation.IUpdate,
        },
      );
    },
  );
}
