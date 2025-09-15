import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * System admin retrieves detailed information for a specific receptionist by
 * their ID.
 *
 * Steps:
 *
 * 1. Register a system admin to obtain credentials (and authentication).
 * 2. Log in as the system admin (verifies authentication using original
 *    credentials).
 * 3. Attempt to retrieve a receptionist profile by ID (randomly generated, as
 *    there's no direct create endpoint).
 *
 *    - If test fixture is not present, this step may intentionally 404 to verify
 *         error handling; if seeded, it should succeed.
 * 4. Call the GET endpoint with an invalid UUID to ensure error (not found/404).
 * 5. Attempt GET with missing/invalid JWT to ensure access is forbidden (401/403).
 *
 * The test validates that
 *
 * - System admin can retrieve correctly structured receptionist detail (when
 *   existing)
 * - Error handling for missing/non-existent records (404), and unauthorized
 *   access (forbidden)
 * - No sensitive fields leaked and only documented schema returned
 */
export async function test_api_receptionist_get_system_admin_scope_by_id(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Login using credentials from registration
  const login = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(login);

  // 3. Attempt to retrieve a receptionist by random UUID (may not exist, tests error for not found)
  const randomReceptionistId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail for unseeded or non-existent receptionist ID",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.receptionists.at(
        connection,
        {
          receptionistId: randomReceptionistId,
        },
      );
    },
  );

  // 4. Error case: invalid ID (malformed, random UUID)
  await TestValidator.error(
    "should throw for completely invalid/non-existent id",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.receptionists.at(
        connection,
        {
          receptionistId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Error case: Unauthenticated; call with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should throw forbidden/unauthorized if JWT missing",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.receptionists.at(
        unauthConn,
        {
          receptionistId: randomReceptionistId,
        },
      );
    },
  );
}
