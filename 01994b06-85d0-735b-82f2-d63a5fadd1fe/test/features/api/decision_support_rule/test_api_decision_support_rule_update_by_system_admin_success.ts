import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin can update an existing clinical decision support rule
 * (CDS rule) and audit fields update correctly.
 *
 * This test simulates the entire business flow: system admin account
 * registration, authentication, CDS rule creation, and updating the rule's
 * details. It asserts that modifiable properties (title, description,
 * trigger_event, expression_json, is_enabled) are correctly mutated, and audit
 * requirements are satisfied (updated_at changes,
 * created_at/organization_id/rule_code remain the same).
 *
 * Steps:
 *
 * 1. System admin registration (POST /auth/systemAdmin/join) with valid business
 *    email/password
 * 2. Admin login (POST /auth/systemAdmin/login) to confirm session
 * 3. Create CDS rule (POST /healthcarePlatform/systemAdmin/decisionSupportRules)
 * 4. Update CDS rule (PUT
 *    /healthcarePlatform/systemAdmin/decisionSupportRules/{ruleId})
 * 5. Validate updated properties, audit fields, and type safety
 */
export async function test_api_decision_support_rule_update_by_system_admin_success(
  connection: api.IConnection,
) {
  // 1. System admin registration
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoin,
  });
  typia.assert(admin);
  // 2. System admin login
  const adminLogin = {
    email: adminJoin.email,
    provider: "local",
    provider_key: adminJoin.provider_key,
    password: adminJoin.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: adminLogin,
  });
  typia.assert(loginResult);
  // 3. Create CDS rule
  const ruleCreate = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    rule_code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
    trigger_event: RandomGenerator.pick([
      "medication_prescribed",
      "lab_result_posted",
      "admission",
      "patient_discharged",
    ] as const),
    expression_json: JSON.stringify({
      op: "and",
      conditions: [{ op: ">", lhs: "lab.value", rhs: 10 }],
    }),
    is_enabled: true,
  } satisfies IHealthcarePlatformDecisionSupportRule.ICreate;
  const created =
    await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.create(
      connection,
      { body: ruleCreate },
    );
  typia.assert(created);
  // 4. Update CDS rule
  const ruleUpdate = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 14,
    }),
    trigger_event: RandomGenerator.pick([
      "order_placed",
      "diagnosis_recorded",
      "procedure_scheduled",
      "admission",
    ] as const),
    expression_json: JSON.stringify({
      op: "or",
      conditions: [{ op: "==", lhs: "trigger", rhs: "order_placed" }],
    }),
    is_enabled: false,
  } satisfies IHealthcarePlatformDecisionSupportRule.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.update(
      connection,
      { ruleId: created.id, body: ruleUpdate },
    );
  typia.assert(updated);
  // 5. Assertions on updated resource
  TestValidator.equals("title is updated", updated.title, ruleUpdate.title);
  TestValidator.equals(
    "description is updated",
    updated.description,
    ruleUpdate.description,
  );
  TestValidator.equals(
    "trigger_event is updated",
    updated.trigger_event,
    ruleUpdate.trigger_event,
  );
  TestValidator.equals(
    "expression_json is updated",
    updated.expression_json,
    ruleUpdate.expression_json,
  );
  TestValidator.equals(
    "is_enabled is updated",
    updated.is_enabled,
    ruleUpdate.is_enabled,
  );
  TestValidator.equals(
    "organization_id is unchanged",
    updated.organization_id,
    ruleCreate.organization_id,
  );
  TestValidator.equals(
    "rule_code is unchanged",
    updated.rule_code,
    ruleCreate.rule_code,
  );
  TestValidator.equals(
    "created_at is unchanged",
    updated.created_at,
    created.created_at,
  );
  TestValidator.predicate(
    "updated_at changed",
    updated.updated_at !== created.updated_at,
  );
}
