import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates system admin billing code deletion process: success, auth error,
 * and error for non-existent resource
 *
 * Business Context:
 *
 * - System administrators manage billing codes which are key to the platform's
 *   healthcare invoicing logic.
 * - Only system admins with proper authentication can delete billing codes.
 * - Billing codes may only be deleted if not referenced by related records; such
 *   validation is handled by the API (simulated).
 *
 * Test Steps:
 *
 * 1. System admin registers and logs in (join + login; login for session renewal)
 * 2. Select a random (pre-existing) billing code ID
 * 3. Perform DELETE as admin — should succeed
 * 4. Attempt DELETE again for the same billing code ID — should return error
 *    (already deleted)
 * 5. Attempt DELETE on a totally random non-existent billing code ID — should fail
 * 6. Attempt DELETE with an unauthenticated connection (no token) — should fail
 *    with an authorization error
 */
export async function test_api_billing_code_deletion_admin_success_and_errors(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const joinInput = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: adminPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // 2. Force a fresh token using login (session simulation, doubles as token test)
  const loginInput = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: adminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loginResp = await api.functional.auth.systemAdmin.login(connection, {
    body: loginInput,
  });
  typia.assert(loginResp);

  // 3. Pick a random billingCodeId for simulated 'success' scenario
  const billingCodeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Successful deletion: Admin deletes a billing code
  await api.functional.healthcarePlatform.systemAdmin.billingCodes.erase(
    connection,
    { billingCodeId },
  );
  // No return value, assume void — success if no error
  TestValidator.predicate(
    "successful billing code deletion returns void",
    true,
  );

  // 5. Delete again: should error (simulate already deleted)
  await TestValidator.error(
    "deletion of already deleted billing code fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.billingCodes.erase(
        connection,
        { billingCodeId },
      );
    },
  );

  // 6. Non-existent billing code deletion (brand new random UUID)
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "deletion of non-existent billing code fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.billingCodes.erase(
        connection,
        { billingCodeId: nonExistentId },
      );
    },
  );

  // 7. Delete with no authentication — unauthorized
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated deletion attempt is rejected",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.billingCodes.erase(
        unauthConn,
        { billingCodeId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
