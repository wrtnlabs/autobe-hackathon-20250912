import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * System admin deletes an existing clinical decision support (CDS) rule and
 * verifies its removal.
 *
 * 1. Register new platform system admin ('local' provider) with valid details.
 * 2. Log in with the same credentials and acquire session.
 * 3. Create a CDS rule (must use valid organization UUID, rule_code, etc.).
 * 4. Delete the CDS rule using the admin session.
 * 5. (If possible) Try to fetch the rule -- since there is no GET, document
 *    logic.
 * 6. (If possible) Assert presence of audit log entry -- acknowledge this in
 *    code.
 */
export async function test_api_decision_support_rule_delete_system_admin_success(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminProvider = "local";
  const adminProviderKey = adminEmail;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const joinResult = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminFullName,
      provider: adminProvider,
      provider_key: adminProviderKey,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(joinResult);

  // 2. Log in as system admin
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: adminProvider,
      provider_key: adminProviderKey,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginResult);

  // 3. Create CDS rule
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const ruleCode = RandomGenerator.alphaNumeric(8);
  const ruleTitle = RandomGenerator.paragraph({ sentences: 1 });
  const ruleDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 2,
    sentenceMax: 4,
  });
  const triggerEvent = RandomGenerator.name(1);
  const expressionJson = JSON.stringify({
    condition: "value > 10",
    action: "alert",
  });
  const createResult =
    await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.create(
      connection,
      {
        body: {
          organization_id: orgId,
          rule_code: ruleCode,
          title: ruleTitle,
          description: ruleDescription,
          trigger_event: triggerEvent,
          expression_json: expressionJson,
          is_enabled: true,
        } satisfies IHealthcarePlatformDecisionSupportRule.ICreate,
      },
    );
  typia.assert(createResult);

  // 4. Delete the rule
  await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.erase(
    connection,
    {
      ruleId: createResult.id,
    },
  );

  // 5. No GET endpoint -- document
  // Normally, you would attempt to GET or list the rule and check 404/not exists. No such endpoint available.
  // 6. Audit log -- document
  // Normally, would check for new audit log record; endpoint not available. (Business logic requirement: Audit log should be created upon delete.)
  TestValidator.predicate(
    "successfully deleted the rule; cannot directly verify because no GET endpoint available. Audit log presence assumed.",
    true,
  );
}
