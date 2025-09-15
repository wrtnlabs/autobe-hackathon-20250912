import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test scenario for creating a new clinical decision support rule as an
 * organization administrator. Validates authentication, organization scope,
 * unique rule_code per organization, and required business logic constraints.
 * Negative tests: duplicate rule_code, and attempt to assign rule to different
 * organization (org_id).
 *
 * 1. Register and onboard a new organization administrator
 * 2. Successfully create a CDS rule scoped to their organization
 * 3. Attempt to re-create a rule with the same rule_code in same org (should fail
 *
 *    - Uniqueness violation)
 * 4. Attempt to create a rule for a different organization_id (should fail - org
 *    admin cannot assign to another org)
 */
export async function test_api_decision_support_rule_create_organization_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a new org admin (using join endpoint; returned id = org scoped)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();
  const adminPassword = RandomGenerator.alphaNumeric(10);

  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminFullName,
      phone: adminPhone,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(admin);
  const organization_id = admin.id satisfies string as string;

  // 2. Create a new rule in this organization
  const rule_code = RandomGenerator.alphaNumeric(12);
  const rule_title = RandomGenerator.paragraph({ sentences: 3 });
  const rule_trigger = RandomGenerator.pick([
    "medication_prescribed",
    "lab_result_posted",
    "patient_admitted",
  ] as const);
  const rule_logic = JSON.stringify({ criteria: "if age>65 then alert" });

  const ruleBody = {
    organization_id,
    rule_code,
    title: rule_title,
    description: RandomGenerator.content({ paragraphs: 2 }),
    trigger_event: rule_trigger,
    expression_json: rule_logic,
    is_enabled: true,
  } satisfies IHealthcarePlatformDecisionSupportRule.ICreate;

  const createdRule =
    await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.create(
      connection,
      { body: ruleBody },
    );
  typia.assert(createdRule);
  TestValidator.equals("rule_code match", createdRule.rule_code, rule_code);
  TestValidator.equals(
    "organization_id match",
    createdRule.organization_id,
    organization_id,
  );
  TestValidator.equals("title match", createdRule.title, rule_title);

  // 3. Attempt to create another rule with the same rule_code in the same org (should fail)
  await TestValidator.error(
    "duplicate rule_code in same org is rejected",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.create(
        connection,
        {
          body: {
            ...ruleBody,
            title: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    },
  );

  // 4. Attempt to create in different org (should fail - admin cannot assign to foreign org)
  await TestValidator.error(
    "reject rule assignment to another org_id",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.create(
        connection,
        {
          body: {
            ...ruleBody,
            rule_code: RandomGenerator.alphaNumeric(12),
            organization_id: typia.random<
              string & tags.Format<"uuid">
            >() satisfies string as string,
          },
        },
      );
    },
  );
}
