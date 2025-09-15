import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test idempotency and missing ruleId behavior of DELETE
 * /healthcarePlatform/systemAdmin/decisionSupportRules/:ruleId
 *
 * 1. Register a new system admin with random credentials.
 * 2. Login as the admin to obtain authentication and set up connection.
 * 3. Generate a random UUID (simulate a ruleId that does not exist in system).
 * 4. Attempt to DELETE using this ruleId and expect an error (such as 404 not
 *    found, error thrown, etc.).
 * 5. Repeat the DELETE for the same ruleId and expect the same error (test
 *    idempotency, effect-free on further calls).
 * 6. Confirm both attempts fail, but with valid business logic error (not type
 *    or protocol error).
 */
export async function test_api_decision_support_rule_delete_idempotency_and_missing_ruleid_handling(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // phone is optional
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as the system admin (triggers SDK to set Authorization header)
  const loginBody = {
    email: joinBody.email,
    provider: joinBody.provider,
    provider_key: joinBody.provider_key,
    password: joinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loggedIn = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedIn);

  // 3. Generate a random (non-existent) ruleId
  const ruleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Attempt to DELETE a non-existent ruleId (expect error)
  await TestValidator.error(
    "DELETEing a missing ruleId returns error for not found",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.erase(
        connection,
        { ruleId },
      );
    },
  );

  // 5. Repeat the DELETE for the same ruleId (should remain idempotent)
  await TestValidator.error(
    "DELETEing the same missing ruleId again is still error - idempotent",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.erase(
        connection,
        { ruleId },
      );
    },
  );
}
