import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates that an organization admin cannot update a decision support rule
 * belonging to another organization (cross-org forbidden test).
 *
 * Steps:
 *
 * 1. Register admin1 for orgA and login.
 * 2. Register admin2 for orgB and login.
 * 3. OrgB admin creates a decision support rule under orgB.
 * 4. OrgA admin tries to update the OrgB-owned rule by ID using a valid update
 *    request.
 * 5. Test expects a forbidden error.
 */
export async function test_api_org_decision_support_rule_update_forbidden_wrong_org(
  connection: api.IConnection,
) {
  // 1. Register orgA admin & login (establish orgA context)
  const orgAEmail = typia.random<string & tags.Format<"email">>();
  const orgAName = RandomGenerator.name();
  const orgAAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAEmail,
        full_name: orgAName,
        password: "testPw1",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAAdmin);

  // 2. Register orgB admin & login (switch to orgB context)
  const orgBEmail = typia.random<string & tags.Format<"email">>();
  const orgBName = RandomGenerator.name();
  const orgBAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgBEmail,
        full_name: orgBName,
        password: "testPw2",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgBAdmin);

  // 3. OrgB admin creates the decision support rule (under OrgB)
  const ruleCreateRequest = {
    organization_id: orgBAdmin.id,
    rule_code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    trigger_event: "lab_result_posted",
    expression_json: JSON.stringify({ op: "alwaysTrue" }),
    is_enabled: true,
  } satisfies IHealthcarePlatformDecisionSupportRule.ICreate;

  const createdRule =
    await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.create(
      connection,
      { body: ruleCreateRequest },
    );
  typia.assert(createdRule);

  // 4. Switch back to orgA admin (login)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAEmail,
      password: "testPw1",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 5. Attempt update as orgA admin on a rule owned by orgB
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    is_enabled: false,
  } satisfies IHealthcarePlatformDecisionSupportRule.IUpdate;

  await TestValidator.error(
    "cannot update decision support rule belonging to another organization",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.update(
        connection,
        {
          ruleId: createdRule.id,
          body: updateBody,
        },
      );
    },
  );
}
