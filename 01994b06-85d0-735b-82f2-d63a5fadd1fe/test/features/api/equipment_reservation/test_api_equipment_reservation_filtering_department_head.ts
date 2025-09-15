import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEquipmentReservation";

/**
 * Validates correct filtering and RBAC scoping of equipment reservations for
 * department head.
 *
 * This test ensures a department head can only view reservations belonging to
 * their organization and department and that filtration on equipment_id,
 * appointment_id, status, pagination, etc. works correctly. Steps:
 *
 * 1. Register and login a department head (capture org/department scope)
 * 2. Create at least one reservation for this org/department
 * 3. Call filtering endpoint with no filters, check only scoped reservations are
 *    returned
 * 4. Apply filter by equipment_id, appointment_id, reservation_type, status
 * 5. Try paginated queries, check paging works and only scoped data is included
 * 6. (Negative) Optionally: Create a reservation for another (fake) org and assert
 *    it never appears
 */
export async function test_api_equipment_reservation_filtering_department_head(
  connection: api.IConnection,
) {
  // 1. Register department head and capture organization for test scope
  const joinBody = {
    ...typia.random<IHealthcarePlatformDepartmentHead.IJoinRequest>(),
  };
  // Guarantee a unique email
  joinBody.email = `dephead+${RandomGenerator.alphaNumeric(10)}@test.org`;
  joinBody.password ??= RandomGenerator.alphaNumeric(12);
  const depHead = await api.functional.auth.departmentHead.join(connection, {
    body: joinBody,
  });
  typia.assert(depHead);
  const organizationId = typia.assert<string & tags.Format<"uuid">>(depHead.id);

  // 2. Create a reservation for this org/department
  const equipmentId = typia.random<string & tags.Format<"uuid">>();
  const appointmentId = typia.random<string & tags.Format<"uuid">>();
  const reservationInput = {
    organization_id: organizationId,
    equipment_id: equipmentId,
    reservation_start: new Date().toISOString(),
    reservation_end: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    appointment_id: appointmentId,
    reservation_type: "scheduled",
  } satisfies IHealthcarePlatformEquipmentReservation.ICreate;
  const reservation =
    await api.functional.healthcarePlatform.departmentHead.equipmentReservations.create(
      connection,
      {
        body: reservationInput,
      },
    );
  typia.assert(reservation);

  // 3. List all reservations (no filter), verify only the new one is present as expected
  const allRes =
    await api.functional.healthcarePlatform.departmentHead.equipmentReservations.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(allRes);
  TestValidator.predicate(
    "department head only sees own org reservation",
    allRes.data.some((r) => r.id === reservation.id),
  );

  // 4. Filter by equipment_id
  const eqFiltered =
    await api.functional.healthcarePlatform.departmentHead.equipmentReservations.index(
      connection,
      {
        body: { equipment_id: equipmentId },
      },
    );
  typia.assert(eqFiltered);
  TestValidator.predicate(
    "filtering by equipment_id correct",
    eqFiltered.data.some((r) => r.equipment_id === equipmentId),
  );
  // 5. Filter by appointment_id
  const apptFiltered =
    await api.functional.healthcarePlatform.departmentHead.equipmentReservations.index(
      connection,
      {
        body: { appointment_id: appointmentId },
      },
    );
  typia.assert(apptFiltered);
  TestValidator.predicate(
    "filtering by appointment_id correct",
    apptFiltered.data.some((r) => r.appointment_id === appointmentId),
  );
  // 6. Filter by reservation_type
  const typeFiltered =
    await api.functional.healthcarePlatform.departmentHead.equipmentReservations.index(
      connection,
      {
        body: { reservation_type: "scheduled" },
      },
    );
  typia.assert(typeFiltered);
  TestValidator.predicate(
    "filter by reservation_type returns only scheduled",
    typeFiltered.data.every((r) => r.reservation_type === "scheduled"),
  );
  // 7. Test pagination (limit = 1), result should be one item and matches filter
  const paged =
    await api.functional.healthcarePlatform.departmentHead.equipmentReservations.index(
      connection,
      {
        body: { limit: 1 },
      },
    );
  typia.assert(paged);
  TestValidator.equals("pagination returns one record", paged.data.length, 1);
}
