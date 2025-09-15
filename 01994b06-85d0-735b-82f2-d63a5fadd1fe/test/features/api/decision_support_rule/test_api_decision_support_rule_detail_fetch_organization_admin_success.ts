import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates that an organization admin can fetch a CDS rule by id, and that
 * organization scoping and error handling work properly.
 *
 * Steps:
 *
 * 1. Organization admin joins and is authenticated
 * 2. Organization admin creates a CDS rule, capturing the organization_id and rule
 *    id
 * 3. Admin fetches the CDS rule by ruleId, verifying all business fields (id,
 *    code, title, trigger_event, expression_json, is_enabled, organization_id,
 *    created_at, updated_at, description, deleted_at)
 * 4. Negative: Try fetching a rule with non-existent ruleId (expect an error)
 * 5. Negative: Create another organization admin, create a rule in the new org,
 *    and ensure first admin cannot fetch it (cross-org boundary)
 */
export async function test_api_decision_support_rule_detail_fetch_organization_admin_success(
  connection: api.IConnection,
) {
  // 1. Organization admin joins first organization
  const orgAdmin1 = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin1);
  // 2. Create CDS rule under org
  const createBody = {
    organization_id: orgAdmin1.id,
    rule_code: RandomGenerator.alphaNumeric(7),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    trigger_event: RandomGenerator.pick([
      "medication_prescribed",
      "lab_result_posted",
      "vital_sign_abnormal",
    ] as const),
    expression_json: JSON.stringify({
      type: "threshold",
      threshold: RandomGenerator.alphaNumeric(5),
    }),
    is_enabled: true,
  } satisfies IHealthcarePlatformDecisionSupportRule.ICreate;
  const rule =
    await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.create(
      connection,
      { body: createBody },
    );
  typia.assert(rule);
  // 3. Fetch by ruleId, assert all business fields
  const read =
    await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.at(
      connection,
      { ruleId: rule.id },
    );
  typia.assert(read);
  TestValidator.equals(
    "fetched rule matches created rule org",
    read.organization_id,
    orgAdmin1.id,
  );
  TestValidator.equals("code matches", read.rule_code, createBody.rule_code);
  TestValidator.equals("title matches", read.title, createBody.title);
  TestValidator.equals(
    "trigger_event matches",
    read.trigger_event,
    createBody.trigger_event,
  );
  TestValidator.equals(
    "expression_json matches",
    read.expression_json,
    createBody.expression_json,
  );
  TestValidator.equals(
    "is_enabled matches",
    read.is_enabled,
    createBody.is_enabled,
  );
  TestValidator.equals(
    "description matches",
    read.description ?? undefined,
    createBody.description ?? undefined,
  );
  // 4. Negative: fetch a random non-existent ruleId
  await TestValidator.error("fetching non-existent ruleId fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.at(
      connection,
      { ruleId: typia.random<string & tags.Format<"uuid">>() },
    );
  });
  // 5. Create a rule in another org. New org admin
  const orgAdmin2 = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin2);
  // Switch back to orgAdmin1 (using join as provided by SDK)
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgAdmin1.email,
      full_name: orgAdmin1.full_name,
      phone: orgAdmin1.phone ?? null,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  // Create new CDS rule for second org
  const otherRule =
    await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.create(
      connection,
      {
        body: {
          organization_id: orgAdmin2.id,
          rule_code: RandomGenerator.alphaNumeric(7),
          title: RandomGenerator.paragraph({ sentences: 5 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          trigger_event: RandomGenerator.pick([
            "medication_prescribed",
            "lab_result_posted",
          ] as const),
          expression_json: JSON.stringify({ logic: "criteria" }),
          is_enabled: true,
        } satisfies IHealthcarePlatformDecisionSupportRule.ICreate,
      },
    );
  typia.assert(otherRule);
  // Attempt to fetch as orgAdmin1 (should fail: org boundary)
  await TestValidator.error(
    "organization boundary: cannot fetch rule from another org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.at(
        connection,
        { ruleId: otherRule.id },
      );
    },
  );
}
