import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";

/**
 * Validate equipment reservation detail retrieval by department head with full
 * RBAC enforcement.
 *
 * Steps:
 *
 * 1. Register department head for org1, login, create equipment reservation
 *    (reservation1)
 * 2. Retrieve reservation1 details as org1's department head (should succeed)
 * 3. Register department head for org2, login
 * 4. Attempt to retrieve reservation1 as org2's dept head (should fail error)
 * 5. Attempt to retrieve a non-existent reservationId (should fail error)
 */
export async function test_api_equipment_reservation_detail_departmenthead_access_and_rbac(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate department head for organization 1
  const departmentHead1Email = typia.random<string & tags.Format<"email">>();
  const departmentHead1Password = RandomGenerator.alphaNumeric(12);
  const join1Req = {
    email: departmentHead1Email,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: departmentHead1Password,
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const auth1 = await api.functional.auth.departmentHead.join(connection, {
    body: join1Req,
  });
  typia.assert(auth1);
  const org1Id = auth1.id;

  // Step 2: Create equipment reservation as organization 1's department head
  const equipmentId = typia.random<string & tags.Format<"uuid">>();
  const equipmentReservationBody1 = {
    organization_id: org1Id,
    equipment_id: equipmentId,
    reservation_start: new Date().toISOString(),
    reservation_end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    reservation_type: "scheduled",
  } satisfies IHealthcarePlatformEquipmentReservation.ICreate;
  const reservation1 =
    await api.functional.healthcarePlatform.departmentHead.equipmentReservations.create(
      connection,
      { body: equipmentReservationBody1 },
    );
  typia.assert(reservation1);

  // Step 3: Retrieve equipment reservation as the owning department head
  const reservationByOwner =
    await api.functional.healthcarePlatform.departmentHead.equipmentReservations.at(
      connection,
      { equipmentReservationId: reservation1.id },
    );
  typia.assert(reservationByOwner);
  TestValidator.equals(
    "reservation details should match id",
    reservationByOwner.id,
    reservation1.id,
  );

  // Step 4: Register and login as a department head for a different organization
  const departmentHead2Email = typia.random<string & tags.Format<"email">>();
  const departmentHead2Password = RandomGenerator.alphaNumeric(12);
  const join2Req = {
    email: departmentHead2Email,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: departmentHead2Password,
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  await api.functional.auth.departmentHead.join(connection, { body: join2Req });
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: departmentHead2Email,
      password: departmentHead2Password,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // Step 5: Attempt to retrieve organization 1's reservation as the other department head (should error)
  await TestValidator.error(
    "RBAC: department head from different org cannot retrieve reservation",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.equipmentReservations.at(
        connection,
        { equipmentReservationId: reservation1.id },
      );
    },
  );

  // Step 6: Attempt to retrieve a non-existent reservation (should error)
  await TestValidator.error(
    "Error with non-existent equipmentReservationId is handled",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.equipmentReservations.at(
        connection,
        {
          equipmentReservationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
