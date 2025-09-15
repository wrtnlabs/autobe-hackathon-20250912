import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * End-to-end test for organization admin equipment reservation creation with
 * full RBAC and business validation.
 *
 * 1. Register an organization admin and login.
 * 2. Create a new reservation as that admin, with valid required fields for their
 *    org.
 * 3. Confirm reservation is created, organization_id matches admin's org.
 * 4. Negative: Attempt reservation for a different org (should fail RBAC logic).
 *
 *    - (Skip all test cases for missing/invalid DTO required fields or invalid
 *         UUIDs: TypeScript will not compile or will type-check these)
 * 5. Negative: Attempt overlapping reservation (business rule): create a
 *    reservation for same equipment, same timeslot.
 *
 *    - Should be rejected by the API as a business rule violation.
 *
 * This test only covers what the API/DTO types allow and skips all negative
 * paths that would cause compilation/type errors.
 */
export async function test_api_equipment_reservation_creation_by_orgadmin_rbac_and_validation(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin and login
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminResult = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinInput },
  );
  typia.assert(adminResult);

  // Login (should auto-handle, but perform for clarity)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: joinInput.email,
      password: joinInput.password!,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const orgId = adminResult.id;

  // 2. Create reservation with valid required fields
  const reservationCreate = {
    organization_id: orgId,
    equipment_id: typia.random<string & tags.Format<"uuid">>(),
    reservation_start: new Date().toISOString(),
    reservation_end: new Date(Date.now() + 3600_000).toISOString(),
    reservation_type: RandomGenerator.pick([
      "scheduled",
      "maintenance",
      "blocked",
    ] as const),
    // Optional
    appointment_id: null,
  } satisfies IHealthcarePlatformEquipmentReservation.ICreate;
  const reservation =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.create(
      connection,
      { body: reservationCreate },
    );
  typia.assert(reservation);
  TestValidator.equals(
    "reservation organization_id matched",
    reservation.healthcare_platform_organization_id,
    orgId,
  );
  TestValidator.equals(
    "reservation equipment_id matched",
    reservation.equipment_id,
    reservationCreate.equipment_id,
  );
  TestValidator.equals(
    "reservation type matched",
    reservation.reservation_type,
    reservationCreate.reservation_type,
  );
  TestValidator.predicate(
    "reservation_start < reservation_end",
    new Date(reservation.reservation_start).getTime() <
      new Date(reservation.reservation_end).getTime(),
  );

  // 3. RBAC negative: different org_id (simulate by a random uuid not matching admin)
  await TestValidator.error(
    "admin cannot create reservation for other org",
    async () => {
      const body = {
        ...reservationCreate,
        organization_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHealthcarePlatformEquipmentReservation.ICreate;
      await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.create(
        connection,
        { body },
      );
    },
  );

  // 4. Negative: business logic error - overlapping reservation for same equipment/timeslot
  await TestValidator.error(
    "cannot create duplicate reservation for same equipment and timeslot",
    async () => {
      // Try to reserve same equipment with identical time slot as previous success
      const body = {
        ...reservationCreate,
      } satisfies IHealthcarePlatformEquipmentReservation.ICreate;
      await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.create(
        connection,
        { body },
      );
    },
  );
}
