import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin updating equipment reservation: happy path and
 * error cases.
 *
 * 1. Register (join) a system admin (random schema-compliant fields)
 * 2. Login as this system admin (for valid session)
 * 3. Create reservation (capture id and sample data)
 * 4. Update reservation with changed reservation_start, reservation_end,
 *    reservation_type (and optionally appointment_id)
 *
 *    - Verify return: updated fields reflect change, unchanged fields are
 *         stable, structure matches expected type
 * 5. Error: (a) update non-existent reservationId (random uuid)
 * 6. Error: (b) update with appointment_id referencing random non-existent
 *    uuid
 *
 * All steps use valid types, random values, full type+business logic
 * checks.
 */
export async function test_api_equipment_reservation_update_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const email = typia.random<string & tags.Format<"email">>();
  const full_name = RandomGenerator.name();
  const provider = "local";
  const provider_key = email;
  const password = RandomGenerator.alphaNumeric(12);

  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email,
      full_name,
      phone: RandomGenerator.mobile(),
      provider,
      provider_key,
      password,
    },
  });
  typia.assert(adminAuth);
  TestValidator.equals("admin email matches", adminAuth.email, email);
  TestValidator.equals(
    "admin full name matches",
    adminAuth.full_name,
    full_name,
  );

  // 2. Login as the system admin (to simulate session/token context)
  const session = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email,
      provider,
      provider_key,
      password,
    },
  });
  typia.assert(session);
  TestValidator.equals(
    "login admin id matches join admin id",
    session.id,
    adminAuth.id,
  );

  // 3. Create equipment reservation
  const reservationCreateData = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    equipment_id: typia.random<string & tags.Format<"uuid">>(),
    reservation_start: new Date(Date.now() + 10000000).toISOString(), // future time
    reservation_end: new Date(Date.now() + 20000000).toISOString(),
    appointment_id: null, // start with no appointment
    reservation_type: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHealthcarePlatformEquipmentReservation.ICreate;
  const reservation =
    await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.create(
      connection,
      { body: reservationCreateData },
    );
  typia.assert(reservation);
  TestValidator.equals(
    "created reservation org id matches",
    reservation.healthcare_platform_organization_id,
    reservationCreateData.organization_id,
  );
  TestValidator.equals(
    "created reservation equip id matches",
    reservation.equipment_id,
    reservationCreateData.equipment_id,
  );
  TestValidator.equals(
    "created reservation type matches",
    reservation.reservation_type,
    reservationCreateData.reservation_type,
  );

  // 4. Update reservation: change reservation window, type
  const updateData = {
    reservation_start: new Date(Date.now() + 40000000).toISOString(),
    reservation_end: new Date(Date.now() + 50000000).toISOString(),
    reservation_type: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHealthcarePlatformEquipmentReservation.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.update(
      connection,
      {
        equipmentReservationId: reservation.id,
        body: updateData,
      },
    );
  typia.assert(updated);
  TestValidator.equals("updated reservation id", updated.id, reservation.id);
  TestValidator.equals(
    "updated org id stable",
    updated.healthcare_platform_organization_id,
    reservationCreateData.organization_id,
  );
  TestValidator.equals(
    "updated equipment id stable",
    updated.equipment_id,
    reservationCreateData.equipment_id,
  );
  TestValidator.equals(
    "updated start time matches",
    updated.reservation_start,
    updateData.reservation_start,
  );
  TestValidator.equals(
    "updated end time matches",
    updated.reservation_end,
    updateData.reservation_end,
  );
  TestValidator.equals(
    "updated reservation_type matches",
    updated.reservation_type,
    updateData.reservation_type,
  );

  // 5. Error: update with non-existent reservation id (should error)
  await TestValidator.error(
    "update with non-existent reservation id should throw",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.update(
        connection,
        {
          equipmentReservationId: typia.random<string & tags.Format<"uuid">>(), // random uuid
          body: updateData,
        },
      );
    },
  );

  // 6. Error: update with invalid appointment id (should error)
  await TestValidator.error(
    "update with invalid appointment_id should throw",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.update(
        connection,
        {
          equipmentReservationId: reservation.id,
          body: {
            appointment_id: typia.random<string & tags.Format<"uuid">>(), // random uuid not assigned, simulates missing appointment
          } satisfies IHealthcarePlatformEquipmentReservation.IUpdate,
        },
      );
    },
  );
}
