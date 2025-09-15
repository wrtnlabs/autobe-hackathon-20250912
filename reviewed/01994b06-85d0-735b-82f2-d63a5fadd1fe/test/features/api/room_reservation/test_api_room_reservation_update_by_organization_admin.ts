import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";

/**
 * Validate updating an existing room reservation as an organization admin.
 *
 * This E2E test verifies that an organization administrator can successfully
 * update a room reservation's key fields: room, reservation times, and
 * reservation type. It covers end-to-end onboarding, update, and business rule
 * validation.
 *
 * Steps:
 *
 * 1. Register (join) as an organization admin.
 * 2. Use typia.random to simulate an existing reservation (since no create/list
 *    for reservations is available).
 * 3. Update the reservation with changed room_id, reservation_start,
 *    reservation_end, and reservation_type fields.
 * 4. Check the updated reservation response for the applied changes using
 *    TestValidator.
 *
 * Error conditions and forbidden/collision/permission scenarios are not
 * implemented as no negative flows or sample data operations are supported by
 * exposed APIs.
 */
export async function test_api_room_reservation_update_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Organization admin onboarding and authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "P@ssw0rd1234",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;

  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Simulate an existing room reservation object
  const oldRoomReservation: IHealthcarePlatformRoomReservation =
    typia.random<IHealthcarePlatformRoomReservation>();

  // 3. Build the update body (choose different room, times, and type)
  const updatedFields = {
    room_id: typia.random<string & tags.Format<"uuid">>(),
    reservation_start: new Date(Date.now() + 3600 * 1000).toISOString(),
    reservation_end: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    reservation_type: "rescheduled_consultation",
    appointment_id: oldRoomReservation.appointment_id,
  } satisfies IHealthcarePlatformRoomReservation.IUpdate;

  // 4. Perform the update
  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.update(
      connection,
      {
        roomReservationId: oldRoomReservation.id,
        body: updatedFields,
      },
    );
  typia.assert(updated);

  // 5. Validate response reflects update - all key fields changed
  TestValidator.notEquals(
    "room_id should be updated",
    updated.room_id,
    oldRoomReservation.room_id,
  );
  TestValidator.notEquals(
    "reservation_start should be updated",
    updated.reservation_start,
    oldRoomReservation.reservation_start,
  );
  TestValidator.notEquals(
    "reservation_end should be updated",
    updated.reservation_end,
    oldRoomReservation.reservation_end,
  );
  TestValidator.notEquals(
    "reservation_type should be updated",
    updated.reservation_type,
    oldRoomReservation.reservation_type,
  );
}
