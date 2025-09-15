import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates deletion of equipment reservation by organization admin, with
 * both success and forbidden error paths.
 *
 * - An org admin (A) is created and logged-in.
 * - Admin (A) creates a new equipment reservation in org A.
 * - Admin (A) successfully deletes the reservation (should succeed).
 *
 * Error path:
 *
 * - Admin (A) attempts to delete a random (non-existent) equipment
 *   reservation (should fail).
 * - Another org admin (B) is created and logged-in (different org).
 * - Admin (B) attempts to delete reservation created by org A admin (should
 *   be forbidden).
 */
export async function test_api_equipment_reservation_delete_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Org admin A joins
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminA = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminAJoinBody,
  });
  typia.assert(adminA);

  // 2. Org admin A logs in (ensures the session is fresh)
  const adminALoginBody = {
    email: adminA.email,
    password: adminAJoinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const adminAAuth = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: adminALoginBody,
    },
  );
  typia.assert(adminAAuth);

  // 3. Org admin A creates an equipment reservation for their own org
  const reservationCreateBody = {
    organization_id: adminA.id as string & tags.Format<"uuid">, // org match
    equipment_id: typia.random<string & tags.Format<"uuid">>(),
    reservation_start: new Date().toISOString(),
    reservation_end: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // +1 hour
    reservation_type: RandomGenerator.pick([
      "scheduled",
      "blocked",
      "maintenance",
    ] as const),
  } satisfies IHealthcarePlatformEquipmentReservation.ICreate;
  const reservation =
    await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.create(
      connection,
      {
        body: reservationCreateBody,
      },
    );
  typia.assert(reservation);

  // 4. Org admin A attempts to delete their own reservation (should succeed)
  await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.erase(
    connection,
    {
      equipmentReservationId: reservation.id,
    },
  );

  // 5. Org admin A attempts to delete a random reservation (should fail)
  await TestValidator.error(
    "delete non-existent equipment reservation should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.erase(
        connection,
        {
          equipmentReservationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Org admin B (different org) joins
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminB = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminBJoinBody,
  });
  typia.assert(adminB);

  // 7. Org admin B logs in
  const adminBLoginBody = {
    email: adminB.email,
    password: adminBJoinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const adminBAuth = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: adminBLoginBody,
    },
  );
  typia.assert(adminBAuth);

  // 8. Org admin B attempts to delete reservation originally created by admin A (should fail/forbidden)
  await TestValidator.error(
    "org admin from different org cannot delete reservation from another org",
    async () => {
      // Since it's already deleted, recreating for test
      const reservationB =
        await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.create(
          connection,
          {
            body: {
              organization_id: adminA.id as string & tags.Format<"uuid">, // purposely target A's org
              equipment_id: typia.random<string & tags.Format<"uuid">>(),
              reservation_start: new Date().toISOString(),
              reservation_end: new Date(
                Date.now() + 60 * 60 * 1000,
              ).toISOString(),
              reservation_type: RandomGenerator.pick([
                "scheduled",
                "blocked",
                "maintenance",
              ] as const),
            } satisfies IHealthcarePlatformEquipmentReservation.ICreate,
          },
        );
      typia.assert(reservationB);
      // Admin B should not be allowed to delete this
      await api.functional.healthcarePlatform.organizationAdmin.equipmentReservations.erase(
        connection,
        {
          equipmentReservationId: reservationB.id,
        },
      );
    },
  );
}
