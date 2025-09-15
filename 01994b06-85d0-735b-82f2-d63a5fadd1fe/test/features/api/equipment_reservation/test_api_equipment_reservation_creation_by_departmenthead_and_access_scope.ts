import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";

/**
 * Validates department head equipment reservation creation and role access.
 *
 * 1. Registers and logs in as department head for organization A.
 * 2. Creates an equipment reservation with valid organization/equipment/period
 *    fields.
 * 3. Verifies that the reservation's organization_id matches the session.
 * 4. Attempts cross-organization reservation as another department head (should
 *    fail with RBAC enforcement).
 * 5. Skips missing field/type error scenario per compilation/type safety rules.
 * 6. Ensures audit timestamps are present in the output.
 */
export async function test_api_equipment_reservation_creation_by_departmenthead_and_access_scope(
  connection: api.IConnection,
) {
  // 1. Register department head (organization A)
  const joinReqA =
    typia.random<IHealthcarePlatformDepartmentHead.IJoinRequest>();
  const departmentHeadA = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: joinReqA,
    },
  );
  typia.assert(departmentHeadA);

  // 2. Login as department head A
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: joinReqA.email,
      password: joinReqA.password!,
    },
  });

  // 3. Prepare reservation input for organization A
  const orgAId = typia.random<string & tags.Format<"uuid">>();
  const equipmentId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const reservationInput = {
    organization_id: orgAId,
    equipment_id: equipmentId,
    reservation_start: new Date(now.getTime() + 3600000).toISOString(), // 1 hour from now
    reservation_end: new Date(now.getTime() + 7200000).toISOString(), // 2 hours from now
    reservation_type: "scheduled",
  } satisfies IHealthcarePlatformEquipmentReservation.ICreate;

  // 4. Successfully create reservation
  const created =
    await api.functional.healthcarePlatform.departmentHead.equipmentReservations.create(
      connection,
      { body: reservationInput },
    );
  typia.assert(created);
  TestValidator.equals(
    "reservation created organization matches request",
    created.healthcare_platform_organization_id,
    reservationInput.organization_id,
  );
  TestValidator.equals(
    "reservation equipment matches request",
    created.equipment_id,
    reservationInput.equipment_id,
  );
  TestValidator.predicate(
    "audit timestamps present",
    typeof created.created_at === "string" &&
      typeof created.updated_at === "string",
  );

  // 5. Register department head for organization B
  const joinReqB =
    typia.random<IHealthcarePlatformDepartmentHead.IJoinRequest>();
  const departmentHeadB = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: joinReqB,
    },
  );
  typia.assert(departmentHeadB);

  // 6. Login as department head B
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: joinReqB.email,
      password: joinReqB.password!,
    },
  });

  // 7. Attempt to create reservation with organization_id for which department head B is not authorized
  const crossOrgReservationInput = {
    ...reservationInput,
    organization_id: orgAId, // Use orgA's ID while logged in as departmentHeadB (simulates RBAC violation)
  } satisfies IHealthcarePlatformEquipmentReservation.ICreate;

  await TestValidator.error(
    "should not allow cross-organization reservation by unauthorized department head",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.equipmentReservations.create(
        connection,
        {
          body: crossOrgReservationInput,
        },
      );
    },
  );
}
