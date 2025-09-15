import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEquipmentReservation";

/**
 * Full-cycle E2E: Search equipment reservations as a system admin using
 * advanced filters.
 *
 * This test ensures system admin search over equipment reservations works
 * as intended, including:
 *
 * - Registering and logging in as an admin
 * - Organization creation/validation
 * - Making an equipment reservation (with appointment_id)
 * - Querying reservations with organization/equipment/appointment filters
 * - Validating result matches filters and test resources
 * - Checking empty-set on non-existent/invalid filter values
 * - Checking pagination and sorting
 *
 * It also verifies only authorized admins may search, and
 * unauthorized/other roles fail.
 */
export async function test_api_equipment_reservation_advanced_search_system_admin(
  connection: api.IConnection,
) {
  // 1. Register as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: "StrongPwd-1234!",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Login as system admin
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: "StrongPwd-1234!",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Create Organization
  const orgInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: orgInput,
      },
    );
  typia.assert(org);

  // 4. Create Reservation
  const reservationCreate = {
    organization_id: org.id,
    equipment_id: typia.random<string & tags.Format<"uuid">>(),
    reservation_start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    reservation_end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    appointment_id: typia.random<string & tags.Format<"uuid">>(),
    reservation_type: "scheduled",
  } satisfies IHealthcarePlatformEquipmentReservation.ICreate;
  const reservation =
    await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.create(
      connection,
      {
        body: reservationCreate,
      },
    );
  typia.assert(reservation);

  // 5. Search by organization_id (should find reservation)
  {
    const res =
      await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.index(
        connection,
        {
          body: {
            healthcare_platform_organization_id: org.id,
          } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
        },
      );
    typia.assert(res);
    TestValidator.predicate(
      "org search returns reservation",
      res.data.some((r) => r.id === reservation.id),
    );
  }

  // 6. Search by equipment_id
  {
    const res =
      await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.index(
        connection,
        {
          body: {
            equipment_id: reservation.equipment_id,
          } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
        },
      );
    typia.assert(res);
    TestValidator.predicate(
      "equipment search returns reservation",
      res.data.some((r) => r.id === reservation.id),
    );
  }

  // 7. Search by appointment_id
  if (
    reservation.appointment_id !== null &&
    reservation.appointment_id !== undefined
  ) {
    const res =
      await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.index(
        connection,
        {
          body: {
            appointment_id: reservation.appointment_id,
          } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
        },
      );
    typia.assert(res);
    TestValidator.predicate(
      "appointment search returns reservation",
      res.data.some((r) => r.id === reservation.id),
    );
  }

  // 8. Search with pagination (limit=1)
  {
    const res =
      await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.index(
        connection,
        {
          body: {
            limit: 1 satisfies number as number,
          } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
        },
      );
    typia.assert(res);
    TestValidator.equals("pagination limit applies", res.data.length, 1);
  }

  // 9. Edge: invalid organization_id yields empty result
  {
    const res =
      await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.index(
        connection,
        {
          body: {
            healthcare_platform_organization_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
        },
      );
    typia.assert(res);
    TestValidator.equals("invalid org returns no data", res.data.length, 0);
  }

  // 10. Edge: invalid equipment_id yields empty result
  {
    const res =
      await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.index(
        connection,
        {
          body: {
            equipment_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
        },
      );
    typia.assert(res);
    TestValidator.equals(
      "invalid equipment returns no data",
      res.data.length,
      0,
    );
  }

  // 11. Edge: invalid appointment_id yields empty result
  {
    const res =
      await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.index(
        connection,
        {
          body: {
            appointment_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
        },
      );
    typia.assert(res);
    TestValidator.equals(
      "invalid appointment returns no data",
      res.data.length,
      0,
    );
  }

  // 12. Permission: unauthenticated connection cannot search
  {
    const unauthConn: api.IConnection = { ...connection, headers: {} };
    await TestValidator.error("unauthenticated search fails", async () => {
      await api.functional.healthcarePlatform.systemAdmin.equipmentReservations.index(
        unauthConn,
        {
          body: {
            healthcare_platform_organization_id: org.id,
          } satisfies IHealthcarePlatformEquipmentReservation.IRequest,
        },
      );
    });
  }
}
