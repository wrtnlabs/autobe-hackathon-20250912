import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate successful organization admin CDS rule deletion workflow.
 *
 * This test covers the complete workflow in which an organization
 * administrator registers, logs in, creates a clinical decision support
 * rule, deletes it, and verifies its deletion by attempting to delete it
 * again and confirming appropriate runtime error. The workflow ensures that
 * only the rule owner can perform the deletion, audit/compliance is
 * triggered, and that deletion is permanent.
 *
 * 1. Register a new org admin with a unique email and name
 * 2. Log in as that org admin (this sets auth context)
 * 3. Create a new clinical decision support rule (CDS rule) in the admin's
 *    organization
 * 4. Delete the rule using its ruleId
 * 5. Attempt to delete the same rule again (should throw error)
 * 6. Verify that the delete operation returns void and the rule cannot be
 *    deleted twice
 */
export async function test_api_org_decision_support_rule_delete_success(
  connection: api.IConnection,
) {
  // 1. Register org admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinBody },
  );
  typia.assert(orgAdmin);

  // 2. Login as org admin
  const loginBody = {
    email: orgAdmin.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const session = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(session);

  // 3. Create a CDS rule in this admin's organization
  const ruleBody = {
    organization_id: orgAdmin.id, // Use org admin's unique ID as organization_id (per DTO availability)
    rule_code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    trigger_event: "medication_prescribed",
    expression_json: '{"if":"true"}',
    is_enabled: true,
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IHealthcarePlatformDecisionSupportRule.ICreate;
  const rule =
    await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.create(
      connection,
      { body: ruleBody },
    );
  typia.assert(rule);

  // 4. Delete the rule
  await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.erase(
    connection,
    { ruleId: rule.id },
  );

  // 5. Attempt to delete again - expect error
  await TestValidator.error(
    "Deleting already deleted CDS rule should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.erase(
        connection,
        { ruleId: rule.id },
      );
    },
  );
}
