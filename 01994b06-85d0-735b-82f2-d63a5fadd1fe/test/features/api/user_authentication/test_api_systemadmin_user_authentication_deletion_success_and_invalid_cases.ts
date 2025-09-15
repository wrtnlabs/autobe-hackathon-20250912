import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";

/**
 * Validate system admin user authentication record deletion – success and error
 * scenarios.
 *
 * - Register as system admin to get admin session
 * - Create a user authentication record (userAuthenticationId)
 * - Delete user authentication record: expect success
 * - Attempt to delete the same record again: expect error
 * - Attempt to delete as unauthorized/non-admin: expect error
 *
 * Steps implemented according to API SDK and DTO constraints.
 */
export async function test_api_systemadmin_user_authentication_deletion_success_and_invalid_cases(
  connection: api.IConnection,
) {
  // Register main admin and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(joinAdmin);

  // Use the admin's user id for user_id on userAuthentication
  const authCreate =
    await api.functional.healthcarePlatform.systemAdmin.userAuthentications.create(
      connection,
      {
        body: {
          user_id: joinAdmin.id,
          user_type: "systemadmin",
          provider: "local",
          provider_key: joinAdmin.email,
          password_hash: undefined, // For SSO can be omitted
        } satisfies IHealthcarePlatformUserAuthentication.ICreate,
      },
    );
  typia.assert(authCreate);

  // Delete user authentication record (should succeed)
  await api.functional.healthcarePlatform.systemAdmin.userAuthentications.erase(
    connection,
    {
      userAuthenticationId: authCreate.id,
    },
  );

  // Try deleting again: should error
  await TestValidator.error(
    "Deleting non-existent user authentication triggers error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userAuthentications.erase(
        connection,
        {
          userAuthenticationId: authCreate.id,
        },
      );
    },
  );

  // Unauthenticated connection (headers cleared)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  // Try deleting as unauthorized user, should error
  await TestValidator.error(
    "Unauthorized deletion attempt blocks access",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userAuthentications.erase(
        unauthConn,
        {
          userAuthenticationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
