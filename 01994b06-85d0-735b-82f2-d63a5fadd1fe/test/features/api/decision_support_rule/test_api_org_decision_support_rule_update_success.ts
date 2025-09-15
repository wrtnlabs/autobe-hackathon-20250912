import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Organization admin updates clinical decision support rule and ensures all
 * properties update as expected.
 *
 * 1. Register a new org admin with unique email and password
 * 2. Login as the org admin
 * 3. Create a CDS rule (capture its organization_id and id)
 * 4. Update several modifiable fields of the rule (title, description, is_enabled,
 *    expression_json, etc) as admin
 * 5. Ensure response reflects updated fields, organization assignment remains
 *    unchanged, id is the same, updated_at timestamp changed
 */
export async function test_api_org_decision_support_rule_update_success(
  connection: api.IConnection,
) {
  // Step 1: Register organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();
  const joinRes = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminFullName,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(joinRes);

  // Step 2: Login as organization admin (ensure token is set and valid)
  const loginRes = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginRes);

  // Step 3: Create a CDS rule assigned to this organization
  const ruleInput = {
    organization_id: joinRes.id,
    rule_code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    trigger_event: RandomGenerator.paragraph({ sentences: 1 }),
    expression_json: JSON.stringify({ op: "alert", threshold: 10, unit: "mg" }),
    is_enabled: true,
  } satisfies IHealthcarePlatformDecisionSupportRule.ICreate;

  const createdRule =
    await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.create(
      connection,
      {
        body: ruleInput,
      },
    );
  typia.assert(createdRule);
  TestValidator.equals(
    "organization assignment retained on creation",
    createdRule.organization_id,
    ruleInput.organization_id,
  );
  const origUpdatedAt = createdRule.updated_at;

  // Step 4: Update a subset of the rule fields
  const updateData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    trigger_event: RandomGenerator.paragraph({ sentences: 1 }),
    expression_json: JSON.stringify({
      op: "alert",
      threshold: 15,
      unit: "mg/kg",
    }),
    is_enabled: false,
  } satisfies IHealthcarePlatformDecisionSupportRule.IUpdate;

  const updatedRule =
    await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.update(
      connection,
      {
        ruleId: createdRule.id,
        body: updateData,
      },
    );
  typia.assert(updatedRule);

  // Step 5: Verify updates and audit trace
  TestValidator.equals(
    "rule ID unchanged after update",
    updatedRule.id,
    createdRule.id,
  );
  TestValidator.equals(
    "organization assignment retained after update",
    updatedRule.organization_id,
    createdRule.organization_id,
  );
  TestValidator.notEquals(
    "title updated",
    updatedRule.title,
    createdRule.title,
  );
  TestValidator.equals(
    "title matches update",
    updatedRule.title,
    updateData.title,
  );
  TestValidator.equals(
    "description matches update",
    updatedRule.description,
    updateData.description,
  );
  TestValidator.equals(
    "trigger_event matches update",
    updatedRule.trigger_event,
    updateData.trigger_event,
  );
  TestValidator.equals(
    "expression_json matches update",
    updatedRule.expression_json,
    updateData.expression_json,
  );
  TestValidator.equals(
    "is_enabled matches update",
    updatedRule.is_enabled,
    updateData.is_enabled,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedRule.updated_at,
    origUpdatedAt,
  );
}
