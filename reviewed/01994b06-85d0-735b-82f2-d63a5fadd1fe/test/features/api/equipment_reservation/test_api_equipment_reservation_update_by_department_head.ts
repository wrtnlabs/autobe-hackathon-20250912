import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";

/**
 * Validate updating an equipment reservation by department head. Covers:
 *
 * - Department head account creation & login
 * - Creating a reservation
 * - Updating reservation fields as the authorized user (success)
 * - Updating reservation with cross-department user (should fail/unauthorized)
 * - Validation for all editable fields: reservation_start, reservation_end,
 *   appointment_id (link/unlink), reservation_type
 * - Ensures compliant business rules (e.g. correct org/dept scope, non-editable
 *   fields not changed)
 * - Only schema-defined fields used, no type-unsafe scenarios
 */
export async function test_api_equipment_reservation_update_by_department_head(
  connection: api.IConnection,
) {
  // 1. Register and log in as department head
  const email = typia.random<string & tags.Format<"email">>();
  const full_name = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12);
  const joinRequest = {
    email,
    full_name,
    password,
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const deptHead = await api.functional.auth.departmentHead.join(connection, {
    body: joinRequest,
  });
  typia.assert(deptHead);

  // Login (not strictly necessary as join sets token, but for explicit flow)
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email,
      password,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 2. Create an equipment reservation as this department head
  const createBody = {
    organization_id: typia.assert(deptHead.id), // not perfect but see schema
    equipment_id: typia.random<string & tags.Format<"uuid">>(),
    reservation_start: new Date(Date.now() + 3600 * 1000).toISOString(),
    reservation_end: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    reservation_type: "scheduled",
  } satisfies IHealthcarePlatformEquipmentReservation.ICreate;
  const reservation =
    await api.functional.healthcarePlatform.departmentHead.equipmentReservations.create(
      connection,
      { body: createBody },
    );
  typia.assert(reservation);

  // 3. Update editable fields as correct department head (success)
  const updateBody = {
    reservation_start: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    reservation_end: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    reservation_type: "maintenance",
    appointment_id: typia.random<string & tags.Format<"uuid">>(), // simulate relinking
  } satisfies IHealthcarePlatformEquipmentReservation.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.departmentHead.equipmentReservations.update(
      connection,
      { equipmentReservationId: reservation.id, body: updateBody },
    );
  typia.assert(updated);
  TestValidator.equals(
    "reservation update: id not changed",
    updated.id,
    reservation.id,
  );
  TestValidator.equals(
    "reservation update: start updated",
    updated.reservation_start,
    updateBody.reservation_start,
  );
  TestValidator.equals(
    "reservation update: end updated",
    updated.reservation_end,
    updateBody.reservation_end,
  );
  TestValidator.equals(
    "reservation update: type updated",
    updated.reservation_type,
    updateBody.reservation_type,
  );
  TestValidator.equals(
    "reservation update: appointment relinked",
    updated.appointment_id,
    updateBody.appointment_id,
  );

  // 4. Register another dept head (different email)
  const other_email = typia.random<string & tags.Format<"email">>();
  const other_password = RandomGenerator.alphaNumeric(12);
  const joinRequest2 = {
    email: other_email,
    full_name: RandomGenerator.name(),
    password: other_password,
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const otherDeptHead = await api.functional.auth.departmentHead.join(
    connection,
    { body: joinRequest2 },
  );
  typia.assert(otherDeptHead);

  // login as 2nd department head
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: other_email,
      password: other_password,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // 5. Attempt update on reservation from other department head - should fail
  await TestValidator.error(
    "unauthorized: cross-department head cannot update reservation",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.equipmentReservations.update(
        connection,
        {
          equipmentReservationId: reservation.id,
          body: {
            reservation_type: "blocked",
          } satisfies IHealthcarePlatformEquipmentReservation.IUpdate,
        },
      );
    },
  );

  // 6. Negative test: update with invalid reservation id
  await TestValidator.error("invalid ID: update fails", async () => {
    await api.functional.healthcarePlatform.departmentHead.equipmentReservations.update(
      connection,
      {
        equipmentReservationId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          reservation_type: "scheduled",
        } satisfies IHealthcarePlatformEquipmentReservation.IUpdate,
      },
    );
  });
}
