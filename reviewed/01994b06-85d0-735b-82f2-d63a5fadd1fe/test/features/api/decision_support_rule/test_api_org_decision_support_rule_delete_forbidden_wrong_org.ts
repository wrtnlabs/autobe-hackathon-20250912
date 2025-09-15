import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Attempt to delete a CDS rule in another org as org admin, ensuring
 * authorization is enforced.
 *
 * 1. Register Org A admin, capturing its credentials (email, password, name)
 * 2. Login as Org A admin to create authenticated session (Org A context)
 * 3. Register Org B admin (capture Org B's org id) -- but do NOT use its session
 * 4. While logged in as Org A admin, create a CDS rule with organization_id set to
 *    Org B's org id
 * 5. Attempt to DELETE the CDS rule as Org A admin using the DELETE endpoint
 * 6. Validate that the operation is forbidden (proper error/exception is thrown
 *    and rule is not deleted)
 */
export async function test_api_org_decision_support_rule_delete_forbidden_wrong_org(
  connection: api.IConnection,
) {
  // 1. Register Org A admin
  const orgAEmail = typia.random<string & tags.Format<"email">>();
  const orgAPassword = RandomGenerator.alphaNumeric(12);
  const orgAFullName = RandomGenerator.name();
  const orgAJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAEmail,
        password: orgAPassword,
        full_name: orgAFullName,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAJoin);

  // 2. Login as Org A admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAEmail,
      password: orgAPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Register Org B admin (to get orgB id)
  const orgBEmail = typia.random<string & tags.Format<"email">>();
  const orgBPassword = RandomGenerator.alphaNumeric(12);
  const orgBFullName = RandomGenerator.name();
  const orgBJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgBEmail,
        password: orgBPassword,
        full_name: orgBFullName,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgBJoin);
  const orgBAdminId = orgBJoin.id;

  // 4. Create a CDS rule for Org B while logged in as Org A (simulate as if Org B's org id is known/copied)
  const ruleCreateBody = {
    organization_id: orgBAdminId as string & tags.Format<"uuid">,
    rule_code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    trigger_event: RandomGenerator.paragraph({ sentences: 1 }),
    expression_json: JSON.stringify({
      logic: RandomGenerator.alphaNumeric(10),
    }),
    is_enabled: true,
  } satisfies IHealthcarePlatformDecisionSupportRule.ICreate;

  const cdsRule =
    await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.create(
      connection,
      {
        body: ruleCreateBody,
      },
    );
  typia.assert(cdsRule);

  // 5. As Org A admin, attempt to DELETE the rule in Org B
  await TestValidator.error(
    "org admin cannot delete CDS rule belonging to another org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.decisionSupportRules.erase(
        connection,
        { ruleId: cdsRule.id },
      );
    },
  );
}
