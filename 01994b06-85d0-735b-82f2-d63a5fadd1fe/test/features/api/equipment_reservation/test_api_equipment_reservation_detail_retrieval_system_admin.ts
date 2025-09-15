import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate the system admin's ability to retrieve equipment reservation details
 * by ID.
 *
 * Scenario Flow:
 *
 * 1. Register and authenticate as system admin (ensures correct RBAC/token
 *    context).
 * 2. Create at least one equipment reservation (require valid organization_id,
 *    equipment_id, required time slots, optional appointment_id,
 *    reservation_type).
 * 3. Call GET-by-ID for the created reservation, validate all returned fields
 *    match expected and typia.assert passes.
 * 4. Negative: GET with random UUID as ID returns not found error.
 */
export async function test_api_equipment_reservation_detail_retrieval_system_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as system admin
  const adminJoin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(adminJoin);

  // Step 2: Create a new equipment reservation
  const reservationCreate = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    equipment_id: typia.random<string & tags.Format<"uuid">>(),
    reservation_start: new Date(Date.now() + 3600_000).toISOString(),
    reservation_end: new Date(Date.now() + 7200_000).toISOString(),
    // Optionally assign appointment_id 50% of the time
    appointment_id:
      Math.random() < 0.5
        ? typia.random<string & tags.Format<"uuid">>()
        : undefined,
    reservation_type: RandomGenerator.name(1),
  } satisfies IHealthcarePlatformEquipmentReservation.ICreate;
  const created: IHealthcarePlatformEquipmentReservation =
    await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.create(
      connection,
      {
        body: reservationCreate,
      },
    );
  typia.assert(created);

  // Step 3: Retrieve the created reservation by ID, validate all required fields
  const retrieved: IHealthcarePlatformEquipmentReservation =
    await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.at(
      connection,
      {
        equipmentReservationId: created.id,
      },
    );
  typia.assert(retrieved);

  // Validate major fields match (relaxed check since timestamps may update)
  TestValidator.equals(
    "equipmentId matches",
    retrieved.equipment_id,
    reservationCreate.equipment_id,
  );
  TestValidator.equals(
    "organizationId matches",
    retrieved.healthcare_platform_organization_id,
    reservationCreate.organization_id,
  );
  TestValidator.equals(
    "reservationStart matches",
    retrieved.reservation_start,
    reservationCreate.reservation_start,
  );
  TestValidator.equals(
    "reservationEnd matches",
    retrieved.reservation_end,
    reservationCreate.reservation_end,
  );
  TestValidator.equals(
    "reservationType matches",
    retrieved.reservation_type,
    reservationCreate.reservation_type,
  );
  // appointment_id is optional, should match or both be undefined/null
  TestValidator.equals(
    "appointmentId matches",
    retrieved.appointment_id ?? undefined,
    reservationCreate.appointment_id ?? undefined,
  );

  TestValidator.predicate(
    "created_at is present",
    typeof retrieved.created_at === "string" && !!retrieved.created_at,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof retrieved.updated_at === "string" && !!retrieved.updated_at,
  );
  TestValidator.equals(
    "deleted_at is not set (active)",
    retrieved.deleted_at ?? undefined,
    undefined,
  );

  // Step 4: Negative test - Try to get reservation by a random non-existent UUID, expect error
  await TestValidator.error("Not found for random UUID", async () => {
    await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.at(
      connection,
      {
        equipmentReservationId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
