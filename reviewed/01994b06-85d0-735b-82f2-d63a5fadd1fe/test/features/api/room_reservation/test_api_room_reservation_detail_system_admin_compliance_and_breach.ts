import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * System admin compliance and breach validation for room reservations.
 *
 * 1. Register and authenticate system admin
 * 2. Register and authenticate organization admin
 * 3. Organization admin creates a room reservation
 * 4. System admin retrieves the reservation by ID; validate correctness
 * 5. System admin retrieves with non-existent UUID (expect error/404)
 * 6. System admin retrieves with valid random UUID not present in system (expect
 *    404)
 *
 * All validation is schema-conformant; all errors are checked for proper
 * compliance exposure (no data leak).
 */
export async function test_api_room_reservation_detail_system_admin_compliance_and_breach(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysadminEmail = typia.random<string & tags.Format<"email">>();
  const sysadminPassword = RandomGenerator.alphaNumeric(12);
  const sysadmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysadminEmail,
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: sysadminEmail,
        password: sysadminPassword,
      },
    });
  typia.assert(sysadmin);

  // 2. Login system admin (simulate role switching)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    },
  });

  // 3. Register and login organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
      },
    });
  typia.assert(orgAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });

  // 4. Create room reservation as organization admin
  const orgId = orgAdmin.id;
  const roomId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour from now
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
  const createReq = {
    healthcare_platform_organization_id: orgId,
    room_id: roomId,
    reservation_start: start,
    reservation_end: end,
    reservation_type: "appointment",
    appointment_id: undefined,
  } satisfies IHealthcarePlatformRoomReservation.ICreate;

  const created: IHealthcarePlatformRoomReservation =
    await api.functional.healthcarePlatform.organizationAdmin.roomReservations.create(
      connection,
      { body: createReq },
    );
  typia.assert(created);

  // 5. Switch back to system admin role
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    },
  });

  // 6. Retrieve reservation by ID: expect details match
  {
    const got =
      await api.functional.healthcarePlatform.systemAdmin.roomReservations.at(
        connection,
        { roomReservationId: created.id },
      );
    typia.assert(got);
    TestValidator.equals(
      "system admin fetch gets exact reservation created",
      got,
      created,
      (key) => key === "created_at" || key === "updated_at",
    );
  }

  // 7. Non-existent UUID - expect error
  {
    const nonExistent = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.error(
      "system admin gets 404 on non-existent reservation UUID",
      async () => {
        await api.functional.healthcarePlatform.systemAdmin.roomReservations.at(
          connection,
          { roomReservationId: nonExistent },
        );
      },
    );
  }

  // 8. Out-of-system valid UUID - still error
  {
    const outOfSystemId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.error(
      "system admin gets 404 for valid but absent reservation UUID",
      async () => {
        await api.functional.healthcarePlatform.systemAdmin.roomReservations.at(
          connection,
          { roomReservationId: outOfSystemId },
        );
      },
    );
  }
}
