import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that a system administrator can successfully fetch the detail of a
 * clinical decision support rule
 *
 * Scenario:
 *
 * 1. Register and authenticate as a system admin using the join endpoint
 * 2. Create a new CDS rule on the platform
 * 3. Fetch the CDS rule by ruleId as the same admin
 * 4. Validate that all properties match what was created (positive path,
 *    field-level validation)
 *
 * This verifies that CDS rule detail fetch works for system admins, covering
 * end-to-end creation-to-query business workflow and confirming correctness of
 * field values, metadata, and permissions.
 */
export async function test_api_decision_support_rule_detail_fetch_system_admin_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as system admin
  const adminJoin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: RandomGenerator.name(1),
        password: "testPassword123!",
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(adminJoin);

  // Step 2: Create a new CDS rule
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const createBody = {
    organization_id: organizationId,
    rule_code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
    trigger_event: RandomGenerator.pick([
      "lab_result_posted",
      "medication_prescribed",
      "patient_admitted",
    ]) as string,
    expression_json: JSON.stringify({
      op: "greaterThan",
      field: "value",
      operand: 10,
    }),
    is_enabled: true,
  } satisfies IHealthcarePlatformDecisionSupportRule.ICreate;
  const createdRule: IHealthcarePlatformDecisionSupportRule =
    await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdRule);

  // Step 3: Fetch the rule by ruleId
  const fetched: IHealthcarePlatformDecisionSupportRule =
    await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.at(
      connection,
      {
        ruleId: createdRule.id,
      },
    );
  typia.assert(fetched);

  // Step 4: Validate all property values match what was created (ignore system-generated fields)
  TestValidator.equals(
    "organization_id matches",
    fetched.organization_id,
    createBody.organization_id,
  );
  TestValidator.equals(
    "rule_code matches",
    fetched.rule_code,
    createBody.rule_code,
  );
  TestValidator.equals("title matches", fetched.title, createBody.title);
  TestValidator.equals(
    "description matches",
    fetched.description,
    createBody.description,
  );
  TestValidator.equals(
    "trigger_event matches",
    fetched.trigger_event,
    createBody.trigger_event,
  );
  TestValidator.equals(
    "expression_json matches",
    fetched.expression_json,
    createBody.expression_json,
  );
  TestValidator.equals(
    "is_enabled matches",
    fetched.is_enabled,
    createBody.is_enabled,
  );
  TestValidator.equals(
    "id is present and matches createdRule",
    fetched.id,
    createdRule.id,
  );

  // Validate system metadata (created/updated timestamps) are present and correctly formatted
  TestValidator.predicate(
    "fetched.created_at is a date-time string",
    typeof fetched.created_at === "string" &&
      /^[0-9]{4}-/.test(fetched.created_at),
  );
  TestValidator.predicate(
    "fetched.updated_at is a date-time string",
    typeof fetched.updated_at === "string" &&
      /^[0-9]{4}-/.test(fetched.updated_at),
  );
}
