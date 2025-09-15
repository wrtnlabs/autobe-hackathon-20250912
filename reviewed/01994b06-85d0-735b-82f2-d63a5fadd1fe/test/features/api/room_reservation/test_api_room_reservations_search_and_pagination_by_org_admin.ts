import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRoomReservation";

/**
 * This test validates that an organization admin can search, filter, and
 * paginate healthcare room reservations tied to their organization, using PATCH
 * /healthcarePlatform/organizationAdmin/roomReservations. It ensures
 * organization boundary enforcement and correct metadata.
 *
 * Steps:
 *
 * 1. Create and authenticate an organization admin
 * 2. Create several room reservations tied to the admin's organization and at
 *    least one reservation for a foreign organization
 * 3. Query with PATCH using no filter (retrieve all paginated)
 * 4. Query using filters on specific room_id and reservation_type
 * 5. Query with filtered date range
 * 6. Query with pagination (limit / page)
 * 7. Validate that all results are scoped to the admin's org (never leak other
 *    organization data)
 * 8. Pagination metadata (current, limit, records, pages) are correct
 * 9. As a control: attempt to call PATCH as an unauthenticated connection (should
 *    error)
 */
export async function test_api_room_reservations_search_and_pagination_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate organization admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "securePassword!123",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: adminJoinInput },
  );
  typia.assert(orgAdmin);

  // 2. Create multiple rooms and reservations within the admin's org
  const organization_id = orgAdmin.id;
  const room_id_1 = typia.random<string & tags.Format<"uuid">>();
  const room_id_2 = typia.random<string & tags.Format<"uuid">>();
  const baseStart = new Date(Date.now() + 3600 * 1000); // 1 hour from now
  const createReservation = async (
    props: Partial<IHealthcarePlatformRoomReservation.ICreate>,
  ) => {
    const reservation =
      await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id:
              props.healthcare_platform_organization_id ?? organization_id,
            room_id: props.room_id ?? room_id_1,
            reservation_start:
              props.reservation_start ?? new Date(baseStart).toISOString(),
            reservation_end:
              props.reservation_end ??
              new Date(baseStart.getTime() + 3600 * 1000).toISOString(),
            reservation_type:
              props.reservation_type ??
              RandomGenerator.pick([
                "appointment",
                "cleaning",
                "maintenance",
              ] as const),
            appointment_id: props.appointment_id,
          } satisfies IHealthcarePlatformRoomReservation.ICreate,
        },
      );
    typia.assert(reservation);
    return reservation;
  };
  // Create a variety of reservations (simulate 5 for org, 1 for foreign org)
  const reservations = await ArrayUtil.asyncRepeat(5, async (idx) => {
    const room_id = idx < 2 ? room_id_1 : room_id_2;
    return await createReservation({ room_id });
  });
  typia.assert(reservations);
  // Foreign org reservation
  const other_organization_id = typia.random<string & tags.Format<"uuid">>();
  await createReservation({
    healthcare_platform_organization_id: other_organization_id,
    room_id: typia.random<string & tags.Format<"uuid">>(),
  });

  // 3. PATCH index with no filters - should get only own org's reservations
  const resultAll =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization_id,
        } satisfies IHealthcarePlatformRoomReservation.IRequest,
      },
    );
  typia.assert(resultAll);
  const returnedIds = resultAll.data.map((r) => r.id);
  for (const r of reservations) {
    TestValidator.predicate(
      "reservation included in index results",
      returnedIds.includes(r.id),
    );
    TestValidator.equals(
      "organization_id matches admin org",
      r.healthcare_platform_organization_id,
      organization_id,
    );
  }
  for (const res of resultAll.data) {
    TestValidator.equals(
      "result organization matches",
      res.healthcare_platform_organization_id,
      organization_id,
    );
  }

  // 4. PATCH index filtering by room_id
  const filterRoomResult =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization_id,
          room_id: room_id_2,
        } satisfies IHealthcarePlatformRoomReservation.IRequest,
      },
    );
  typia.assert(filterRoomResult);
  for (const r of filterRoomResult.data) {
    TestValidator.equals("room id matches filter", r.room_id, room_id_2);
    TestValidator.equals(
      "organization_id matches admin org",
      r.healthcare_platform_organization_id,
      organization_id,
    );
  }

  // 5. PATCH index filtering by reservation_type
  const sampleType = reservations[0].reservation_type;
  const filterTypeResult =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization_id,
          reservation_type: sampleType,
        } satisfies IHealthcarePlatformRoomReservation.IRequest,
      },
    );
  typia.assert(filterTypeResult);
  for (const r of filterTypeResult.data) {
    TestValidator.equals(
      "filtered type matches",
      r.reservation_type,
      sampleType,
    );
    TestValidator.equals(
      "organization_id matches admin org",
      r.healthcare_platform_organization_id,
      organization_id,
    );
  }

  // 6. PATCH index with date range
  const minStart = reservations.reduce(
    (min, cur) => (cur.reservation_start < min.reservation_start ? cur : min),
    reservations[0],
  ).reservation_start;
  const rangeStart = minStart;
  const rangeEnd = new Date(
    new Date(rangeStart).getTime() + 7200 * 1000,
  ).toISOString(); // +2 hours
  const rangeResult =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization_id,
          reservation_start: rangeStart,
          reservation_end: rangeEnd,
        } satisfies IHealthcarePlatformRoomReservation.IRequest,
      },
    );
  typia.assert(rangeResult);
  for (const r of rangeResult.data) {
    TestValidator.predicate(
      "reservation in range",
      r.reservation_start >= rangeStart && r.reservation_end <= rangeEnd,
    );
    TestValidator.equals(
      "organization_id matches admin org",
      r.healthcare_platform_organization_id,
      organization_id,
    );
  }

  // 7. PATCH index with pagination
  const pageSize = 2;
  const page1 =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organization_id,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          pageSize,
        } satisfies IHealthcarePlatformRoomReservation.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "pagination current page is 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is pageSize",
    page1.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "page 1 result length <= pageSize",
    page1.data.length <= pageSize,
  );

  // 8. Control: PATCH as unauthenticated (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated call is forbidden", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.index(
      unauthConn,
      {
        body: {
          healthcare_platform_organization_id: organization_id,
        } satisfies IHealthcarePlatformRoomReservation.IRequest,
      },
    );
  });
}
