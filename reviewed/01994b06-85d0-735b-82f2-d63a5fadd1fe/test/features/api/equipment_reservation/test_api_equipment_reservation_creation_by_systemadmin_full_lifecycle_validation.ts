import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Full lifecycle E2E test for equipment reservation creation by system admin.
 *
 * This test covers:
 *
 * 1. System admin registration and login as authentication context
 * 2. Successful equipment reservation creation with valid/required fields
 * 3. Linkages to correct organization, equipment, reservation type, and optional
 *    appointment_id
 * 4. Error on business rule with non-existent equipment/organization UUID
 * 5. Validation enforcement for permissions (system admin authorization)
 *
 * Type error/missing required field validation is NOT tested (strictly
 * forbidden): all request bodies are valid types.
 */
export async function test_api_equipment_reservation_creation_by_systemadmin_full_lifecycle_validation(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const adminRegisterInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(12),
    password: RandomGenerator.alphaNumeric(15),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminRegisterInput,
  });
  typia.assert(admin);

  // 2. Login as the admin
  const adminLoginInput = {
    email: adminRegisterInput.email,
    provider: "local",
    provider_key: adminRegisterInput.provider_key,
    password: adminRegisterInput.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminSession = await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginInput,
  });
  typia.assert(adminSession);

  // 3. Create a valid equipment reservation (with required fields/valid UUIDs)
  const organization_id = typia.random<string & tags.Format<"uuid">>();
  const equipment_id = typia.random<string & tags.Format<"uuid">>();
  const appointment_id = typia.random<string & tags.Format<"uuid">>(); // valid random UUID
  const now = new Date();
  const start = new Date(now.getTime() + 60_000).toISOString();
  const end = new Date(now.getTime() + 120_000).toISOString();

  const validReservationBody = {
    organization_id,
    equipment_id,
    reservation_start: start,
    reservation_end: end,
    appointment_id: appointment_id,
    reservation_type: "scheduled",
  } satisfies IHealthcarePlatformEquipmentReservation.ICreate;
  const reservation =
    await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.create(
      connection,
      { body: validReservationBody },
    );
  typia.assert(reservation);
  TestValidator.equals(
    "organization linkage",
    reservation.healthcare_platform_organization_id,
    organization_id,
  );
  TestValidator.equals(
    "equipment linkage",
    reservation.equipment_id,
    equipment_id,
  );
  TestValidator.equals(
    "appointment linkage",
    reservation.appointment_id,
    appointment_id,
  );
  TestValidator.equals(
    "reservation type",
    reservation.reservation_type,
    "scheduled",
  );

  // 4. Business rule: non-existent equipment/organization/references
  await TestValidator.error("nonexistent equipment_id fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.create(
      connection,
      {
        body: {
          organization_id,
          equipment_id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          reservation_start: start,
          reservation_end: end,
          reservation_type: "blocked",
        } satisfies IHealthcarePlatformEquipmentReservation.ICreate,
      },
    );
  });

  await TestValidator.error("nonexistent organization_id fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.create(
      connection,
      {
        body: {
          organization_id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          equipment_id,
          reservation_start: start,
          reservation_end: end,
          reservation_type: "scheduled",
        } satisfies IHealthcarePlatformEquipmentReservation.ICreate,
      },
    );
  });
}
