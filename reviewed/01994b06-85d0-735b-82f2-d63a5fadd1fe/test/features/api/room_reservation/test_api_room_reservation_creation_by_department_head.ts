import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";

/**
 * End-to-end test for creating a room reservation as a department head.
 *
 * Steps:
 *
 * 1. Register and authenticate a department head user.
 * 2. Attempt to create a valid room reservation, assert success.
 * 3. Attempt to create a duplicate reservation (same time/room), expect error.
 * 4. Attempt reservation for a non-existent room/organization, expect error.
 * 5. Attempt reservation with a department head from another org, expect error.
 */
export async function test_api_room_reservation_creation_by_department_head(
  connection: api.IConnection,
) {
  // 1. Register and authenticate department head
  const joinReq =
    typia.random<IHealthcarePlatformDepartmentHead.IJoinRequest>();
  const departmentHead: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: joinReq,
    });
  typia.assert(departmentHead);

  // For this test, create constant org and room UUIDs for determinism
  const orgId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const roomId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Create a valid room reservation
  const reservationBody = {
    healthcare_platform_organization_id: orgId,
    room_id: roomId,
    reservation_start: new Date(Date.now() + 3600000).toISOString(),
    reservation_end: new Date(Date.now() + 7200000).toISOString(),
    reservation_type: "appointment",
    appointment_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IHealthcarePlatformRoomReservation.ICreate;
  const reservation =
    await api.functional.healthcarePlatform.departmentHead.roomReservations.create(
      connection,
      {
        body: reservationBody,
      },
    );
  typia.assert(reservation);
  TestValidator.equals(
    "Reservation org matches",
    reservation.healthcare_platform_organization_id,
    reservationBody.healthcare_platform_organization_id,
  );
  TestValidator.equals(
    "Reservation room id matches",
    reservation.room_id,
    reservationBody.room_id,
  );
  TestValidator.equals(
    "Reservation start matches",
    reservation.reservation_start,
    reservationBody.reservation_start,
  );
  TestValidator.equals(
    "Reservation end matches",
    reservation.reservation_end,
    reservationBody.reservation_end,
  );
  TestValidator.equals(
    "Reservation type matches",
    reservation.reservation_type,
    reservationBody.reservation_type,
  );

  // 3. Attempt to double-book (should fail)
  await TestValidator.error("Double booking forbidden", async () => {
    await api.functional.healthcarePlatform.departmentHead.roomReservations.create(
      connection,
      {
        body: reservationBody,
      },
    );
  });

  // 4. Non-existent room (simulate by changing to a new random UUID)
  const invalidRoomBody = {
    ...reservationBody,
    room_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IHealthcarePlatformRoomReservation.ICreate;
  await TestValidator.error("Non-existent room ID should fail", async () => {
    await api.functional.healthcarePlatform.departmentHead.roomReservations.create(
      connection,
      {
        body: invalidRoomBody,
      },
    );
  });

  // 5. Attempt with department head from another org (simulate by new join and use reservationBody with own orgId)
  const otherHeadReq =
    typia.random<IHealthcarePlatformDepartmentHead.IJoinRequest>();
  const otherHead: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: otherHeadReq,
    });
  typia.assert(otherHead);
  // Try to create room reservation for different org (should trigger business rule error)
  await TestValidator.error(
    "Other department head cannot reserve for this org",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.roomReservations.create(
        connection,
        {
          body: {
            ...reservationBody,
            healthcare_platform_organization_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IHealthcarePlatformRoomReservation.ICreate,
        },
      );
    },
  );
}
