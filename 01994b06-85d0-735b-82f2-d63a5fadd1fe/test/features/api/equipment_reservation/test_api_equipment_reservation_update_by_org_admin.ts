import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Organization admin can update equipment reservation within their org and
 * cannot update others'. Covers successful update, update with invalid ID,
 * unauthorized org context, and invalid appointment linking.
 */
export async function test_api_equipment_reservation_update_by_org_admin(
  connection: api.IConnection,
) {
  // Setup: create fixed org ids
  const orgIdA: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orgIdB: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 1. Register and login as org admin A (in org A)
  const joinInputA = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: "P@ssw0rd!", // sample password
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminA = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinInputA,
  });
  typia.assert(adminA);

  // 2. Create an equipment reservation for org admin A
  const eqId = typia.random<string & tags.Format<"uuid">>();
  const reservationInput = {
    organization_id: orgIdA,
    equipment_id: eqId,
    reservation_start: new Date().toISOString(),
    reservation_end: new Date(Date.now() + 3600 * 1000).toISOString(),
    reservation_type: RandomGenerator.pick([
      "scheduled",
      "maintenance",
      "blocked",
    ] as const),
    appointment_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IHealthcarePlatformEquipmentReservation.ICreate;
  const reservation =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.create(
      connection,
      { body: reservationInput },
    );
  typia.assert(reservation);

  // 3. Valid update: change reservation_type & extend end
  const updateInput = {
    reservation_end: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    reservation_type: "maintenance",
  } satisfies IHealthcarePlatformEquipmentReservation.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.update(
      connection,
      { equipmentReservationId: reservation.id, body: updateInput },
    );
  typia.assert(updated);
  TestValidator.equals(
    "reservation_type updated",
    updated.reservation_type,
    "maintenance",
  );

  // 4. Error: invalid reservation ID
  await TestValidator.error("update with bad ID fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.update(
      connection,
      {
        equipmentReservationId: typia.random<string & tags.Format<"uuid">>(),
        body: updateInput,
      },
    );
  });

  // 5. Register/login org admin B (other org)
  const joinInputB = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: "P@ssw0rd!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminB = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinInputB,
  });
  typia.assert(adminB);
  // Login as org admin B
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: joinInputB.email,
      password: joinInputB.password,
    },
  });
  // Try updating A's reservation as B
  await TestValidator.error("org B cannot update A's reservation", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.update(
      connection,
      {
        equipmentReservationId: reservation.id,
        body: { reservation_type: "blocked" },
      },
    );
  });

  // 6. Switch back to admin A (login)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: joinInputA.email,
      password: joinInputA.password,
    },
  });

  // 7. Update with invalid appointment_id (simulate missing FK)
  await TestValidator.error(
    "update with invalid appointment_id fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.update(
        connection,
        {
          equipmentReservationId: reservation.id,
          body: {
            appointment_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // 8. Valid update to null appointment_id
  const nullUpdate = {
    appointment_id: null,
  } satisfies IHealthcarePlatformEquipmentReservation.IUpdate;
  const result =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.update(
      connection,
      { equipmentReservationId: reservation.id, body: nullUpdate },
    );
  typia.assert(result);
  TestValidator.equals("appointment_id is null", result.appointment_id, null);
}
