import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRoomReservation";

/**
 * Tests department head scoped reservation search and pagination, and verifies
 * access isolation.
 *
 * 1. Register as department head (join & login)
 * 2. Create a room reservation in the department head's org/department
 * 3. Search via PATCH /roomReservations with filters and pagination (should
 *    retrieve the just-created reservation)
 * 4. Paginate with search criteria (should find the proper booking and exclude
 *    irrelevant ones)
 * 5. Attempt search for rooms not in scope (should return empty)
 * 6. Attempt search/pagination as unauthenticated (should be denied)
 */
export async function test_api_room_reservations_search_and_pagination_by_department_head(
  connection: api.IConnection,
) {
  // 1. Register as department head
  const deptHeadEmail: string = typia.random<string & tags.Format<"email">>();
  const deptHeadJoinBody = {
    email: deptHeadEmail,
    full_name: RandomGenerator.name(),
    password: "securePass123",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const deptHead: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: deptHeadJoinBody,
    });
  typia.assert(deptHead);

  // 2. Login as department head to set token
  const loginBody = {
    email: deptHeadEmail,
    password: "securePass123",
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const loggedInHead = await api.functional.auth.departmentHead.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedInHead);

  // 3. Create a reservation in department head context
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const roomId = typia.random<string & tags.Format<"uuid">>();
  const reservationStart = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const reservationEnd = new Date(
    Date.now() + 2 * 60 * 60 * 1000,
  ).toISOString();
  const reservationType = RandomGenerator.pick([
    "appointment",
    "admin",
    "cleaning",
    "maintenance",
  ] as const);
  const reservationCreateBody = {
    healthcare_platform_organization_id: orgId,
    room_id: roomId,
    reservation_start: reservationStart,
    reservation_end: reservationEnd,
    reservation_type: reservationType,
  } satisfies IHealthcarePlatformRoomReservation.ICreate;
  const reservation =
    await api.functional.healthcarePlatform.departmentHead.roomReservations.create(
      connection,
      { body: reservationCreateBody },
    );
  typia.assert(reservation);

  // 4. Search with filters (should return the just created reservation)
  const searchBody = {
    healthcare_platform_organization_id: orgId,
    room_id: roomId,
    reservation_type: reservationType,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IHealthcarePlatformRoomReservation.IRequest;
  const pageResult =
    await api.functional.healthcarePlatform.departmentHead.roomReservations.index(
      connection,
      { body: searchBody },
    );
  typia.assert(pageResult);
  TestValidator.predicate(
    "Should find reservation in search results",
    pageResult.data.some((r) => r.id === reservation.id),
  );

  // 5. Search for another random org/room (should return empty)
  const searchInvalidBody = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    room_id: typia.random<string & tags.Format<"uuid">>(),
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IHealthcarePlatformRoomReservation.IRequest;
  const pageResultInvalid =
    await api.functional.healthcarePlatform.departmentHead.roomReservations.index(
      connection,
      { body: searchInvalidBody },
    );
  typia.assert(pageResultInvalid);
  TestValidator.equals(
    "Should find 0 reservations for wrong org/room",
    pageResultInvalid.data.length,
    0,
  );

  // 6. Try as a non-department-head (simulate by clearing token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Should be denied for unauthenticated user",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.roomReservations.index(
        unauthConn,
        { body: searchBody },
      );
    },
  );
}
