import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Attempt to update a CDS rule with an invalid/nonexistent ruleId.
 *
 * 1. Register a new system admin for test authentication context
 * 2. Login as system admin to acquire JWT session
 * 3. Attempt to PUT to a random/nonexistent ruleId, with a valid but arbitrary
 *    rule body (using IHealthcarePlatformDecisionSupportRule.IUpdate)
 * 4. Confirm that the API returns an error (404 or equivalent), and does NOT
 *    succeed
 */
export async function test_api_decision_support_rule_update_invalid_ruleid_denied(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: "TestPassword123!",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as system admin
  const loginBody = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: "TestPassword123!",
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const authorized = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(authorized);

  // 3. Attempt to update a non-existent CDS rule
  const invalidRuleId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    trigger_event: RandomGenerator.name(1),
    expression_json: "{}",
    is_enabled: false,
  } satisfies IHealthcarePlatformDecisionSupportRule.IUpdate;
  await TestValidator.error(
    "should reject update with invalid ruleId",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.update(
        connection,
        {
          ruleId: invalidRuleId,
          body: updateBody,
        },
      );
    },
  );
}
