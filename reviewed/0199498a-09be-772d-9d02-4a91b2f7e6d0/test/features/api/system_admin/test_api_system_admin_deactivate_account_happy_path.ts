import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate full deactivation (soft delete) lifecycle for a systemAdmin account.
 *
 * This scenario demonstrates the following:
 *
 * 1. Register a new systemAdmin (join) and verify creation.
 * 2. Login using the credentials to verify access (i.e., active login).
 * 3. Deactivate (erase/soft-delete) the admin using the DELETE API.
 * 4. Confirm after deletion that:
 *
 *    - Login as this admin is denied
 *    - Second deactivation request results in error
 */
export async function test_api_system_admin_deactivate_account_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a new systemAdmin
  const joinBody = {
    external_admin_id: RandomGenerator.alphaNumeric(16),
    email: `${RandomGenerator.alphaNumeric(12)}@autobetest.com`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  TestValidator.equals(
    "systemAdmin created_at present",
    typeof admin.created_at,
    "string",
  );
  TestValidator.equals(
    "systemAdmin deleted_at should initially be null",
    admin.deleted_at,
    null,
  );

  // 2. Login using identifiers
  const loginBody = {
    external_admin_id: joinBody.external_admin_id,
    email: joinBody.email,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;
  const loginResult: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // 3. Deactivate (soft delete) systemAdmin
  await api.functional.storyfieldAi.systemAdmin.systemAdmins.erase(connection, {
    systemAdminId: admin.id,
  });

  // 4. Confirm login is denied after deactivation
  await TestValidator.error("login denied post-deactivation", async () => {
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  });

  // 5. Second delete attempt returns error
  await TestValidator.error("second delete throws error", async () => {
    await api.functional.storyfieldAi.systemAdmin.systemAdmins.erase(
      connection,
      {
        systemAdminId: admin.id,
      },
    );
  });
}
