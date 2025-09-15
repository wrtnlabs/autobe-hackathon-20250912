import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that a system administrator can create a clinical decision support
 * rule (CDS rule) with required metadata, and that constraints are enforced for
 * unique rule code, organization linkage, and required fields.
 *
 * 1. Register and authenticate as a system administrator
 * 2. Create a CDS rule with valid metadata (organization_id, rule_code, title,
 *    etc.)
 * 3. Validate successful rule creation and correct response properties (including
 *    timestamps, uuid, status, etc.)
 * 4. Attempt to create a CDS rule with duplicate rule_code in same organization
 *    (expect error)
 */
export async function test_api_decision_support_rule_create_system_admin_success(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: adminBody });
  typia.assert(admin);
  const organizationId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create valid CDS rule as system admin
  const rule_code = RandomGenerator.alphaNumeric(10);
  const ruleBody = {
    organization_id: organizationId,
    rule_code,
    title: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
    trigger_event: RandomGenerator.pick([
      "medication_prescribed",
      "lab_result_posted",
      "appointment_scheduled",
    ] as const),
    expression_json: '{"if":"A > 1","then":"alert"}',
    is_enabled: true,
  } satisfies IHealthcarePlatformDecisionSupportRule.ICreate;
  const created: IHealthcarePlatformDecisionSupportRule =
    await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.create(
      connection,
      { body: ruleBody },
    );
  typia.assert(created);
  TestValidator.equals(
    "organization_id matches",
    created.organization_id,
    ruleBody.organization_id,
  );
  TestValidator.equals("rule_code matches", created.rule_code, rule_code);
  TestValidator.equals("title matches", created.title, ruleBody.title);
  TestValidator.predicate(
    "created.is_enabled is true",
    created.is_enabled === true,
  );
  TestValidator.predicate(
    "created_at is ISO8601 format",
    typeof created.created_at === "string" &&
      !isNaN(Date.parse(created.created_at)),
  );

  // 4. Error: duplicate rule_code (should fail)
  await TestValidator.error(
    "duplicate rule_code in same organization should throw",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.create(
        connection,
        { body: { ...ruleBody, rule_code } },
      );
    },
  );
}
