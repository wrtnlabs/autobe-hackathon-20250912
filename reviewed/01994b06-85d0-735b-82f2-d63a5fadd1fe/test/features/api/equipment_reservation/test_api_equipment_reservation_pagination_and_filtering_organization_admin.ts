import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEquipmentReservation";

/**
 * Validates paginated and filtered retrieval of equipment reservations by
 * an organization administrator.
 *
 * This test ensures that an authenticated organization admin can list
 * equipment reservations belonging only to their organization and can apply
 * various filters such as equipment ID, appointment ID, reservation type,
 * status, and date ranges. Pagination mechanics are verified for boundary
 * conditions, including changes of page/limit, ordering, and sorting by
 * reservation start.
 *
 * Steps:
 *
 * 1. Register and authenticate a new organization admin.
 * 2. Create a minimum of two reservation records with different values for
 *    equipment_id, appointment_id, reservation_type, and time windows. All
 *    records should belong to the test admin's organization.
 * 3. Successfully retrieve reservations without filters, then with specific
 *    filters (equipment_id, appointment_id, reservation_type, status, date
 *    ranges, etc), verifying only correct records are returned.
 * 4. Verify pagination (page/limit mechanics), including data boundaries and
 *    sorting by reservation_start.
 * 5. Attempt to query with filters that should yield no results (invalid
 *    equipment_id, cross-org ids).
 * 6. Test error handling for invalid filter combinations or RBAC violations
 *    (e.g., using unauthorized organization_id).
 */
export async function test_api_equipment_reservation_pagination_and_filtering_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new organization admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphabets(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create at least 2 reservation records with varying equipment_id, appointment_id, reservation_type, and periods
  const equipmentIdA = typia.random<string & tags.Format<"uuid">>();
  const equipmentIdB = typia.random<string & tags.Format<"uuid">>();
  const appointmentIdA = typia.random<string & tags.Format<"uuid">>();
  const appointmentIdB = typia.random<string & tags.Format<"uuid">>();

  // Reservation A
  const reservationBodyA = {
    organization_id: admin.id, // assuming admin.id is used as the organization id
    equipment_id: equipmentIdA,
    appointment_id: appointmentIdA,
    reservation_type: "scheduled",
    reservation_start: new Date(Date.now() + 3600 * 1000).toISOString(),
    reservation_end: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
  } satisfies IHealthcarePlatformEquipmentReservation.ICreate;
  const reservationA =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.create(
      connection,
      { body: reservationBodyA },
    );
  typia.assert(reservationA);

  // Reservation B
  const reservationBodyB = {
    organization_id: admin.id, // as above, using admin.id for organization_id
    equipment_id: equipmentIdB,
    appointment_id: appointmentIdB,
    reservation_type: "maintenance",
    reservation_start: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    reservation_end: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
  } satisfies IHealthcarePlatformEquipmentReservation.ICreate;
  const reservationB =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.create(
      connection,
      { body: reservationBodyB },
    );
  typia.assert(reservationB);

  // 3. Retrieve reservations without filters: both should be present
  const res0 =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.index(
      connection,
      { body: {} satisfies IHealthcarePlatformEquipmentReservation.IRequest },
    );
  typia.assert(res0);
  TestValidator.predicate(
    "all reservations belong to organization admin",
    res0.data.every((r) => r.healthcare_platform_organization_id === admin.id),
  );
  TestValidator.predicate(
    "both reservations present",
    res0.data.some((r) => r.id === reservationA.id) &&
      res0.data.some((r) => r.id === reservationB.id),
  );

  // 4. Retrieve with specific filters
  // equipment_id filter
  const filterEquipmentRes =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.index(
      connection,
      {
        body: {
          equipment_id: equipmentIdA,
        } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
      },
    );
  typia.assert(filterEquipmentRes);
  TestValidator.predicate(
    "filter by equipment_id",
    filterEquipmentRes.data.every((r) => r.equipment_id === equipmentIdA),
  );

  // appointment_id filter
  const filterAppointmentRes =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.index(
      connection,
      {
        body: {
          appointment_id: appointmentIdB,
        } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
      },
    );
  typia.assert(filterAppointmentRes);
  TestValidator.predicate(
    "filter by appointment_id",
    filterAppointmentRes.data.every((r) => r.appointment_id === appointmentIdB),
  );

  // reservation_type filter
  const filterTypeRes =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.index(
      connection,
      {
        body: {
          reservation_type: "maintenance",
        } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
      },
    );
  typia.assert(filterTypeRes);
  TestValidator.predicate(
    "filter by reservation_type",
    filterTypeRes.data.every((r) => r.reservation_type === "maintenance"),
  );

  // reservation_start date range
  const filterDateRangeRes =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.index(
      connection,
      {
        body: {
          reservation_start_from: reservationBodyA.reservation_start,
          reservation_start_to: reservationBodyA.reservation_end,
        } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
      },
    );
  typia.assert(filterDateRangeRes);
  TestValidator.predicate(
    "filter by reservation_start range",
    filterDateRangeRes.data.every(
      (r) =>
        new Date(r.reservation_start) >=
          new Date(reservationBodyA.reservation_start) &&
        new Date(r.reservation_start) <=
          new Date(reservationBodyA.reservation_end),
    ),
  );

  // 5. Pagination — page/limit
  const resPage1 =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
      },
    );
  typia.assert(resPage1);
  TestValidator.equals("limit 1 gives 1 record", resPage1.data.length, 1);

  // Page 2
  const resPage2 =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.index(
      connection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
      },
    );
  typia.assert(resPage2);
  TestValidator.equals(
    "limit 1 page 2 gives 1 record",
    resPage2.data.length,
    1,
  );
  TestValidator.notEquals(
    "page 1 and page 2 have different IDs",
    resPage1.data[0]?.id,
    resPage2.data[0]?.id,
  );

  // 6. Sort by reservation_start ascending
  const sortAsc =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.index(
      connection,
      {
        body: {
          sort_by: "reservation_start",
          sort_order: "asc",
        } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
      },
    );
  typia.assert(sortAsc);
  TestValidator.predicate(
    "sorted ascending by reservation_start",
    sortAsc.data.every(
      (r, i, arr) =>
        i === 0 ||
        new Date(arr[i - 1].reservation_start) <= new Date(r.reservation_start),
    ),
  );

  // 7. Filter with random/invalid equipment_id (should get empty result)
  const invalidEquipmentId = typia.random<string & tags.Format<"uuid">>();
  const resInvalidEq =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.index(
      connection,
      {
        body: {
          equipment_id: invalidEquipmentId,
        } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
      },
    );
  typia.assert(resInvalidEq);
  TestValidator.equals(
    "invalid equipment_id yields no results",
    resInvalidEq.data.length,
    0,
  );

  // 8. (Negative) Try to use a fake organization_id not belonging to this admin (should error/empty)
  const fakeOrgId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "organization admin cannot query unauthorized organization_id",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.index(
        connection,
        {
          body: {
            healthcare_platform_organization_id: fakeOrgId,
          } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
        },
      );
    },
  );
}
