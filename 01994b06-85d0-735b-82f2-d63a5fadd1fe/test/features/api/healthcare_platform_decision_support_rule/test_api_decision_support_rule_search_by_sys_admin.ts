import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDecisionSupportRule";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformDecisionSupportRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDecisionSupportRule";

/**
 * Search CDS rules as system admin, validating full admin access, filters,
 * sorting, pagination, and error handling.
 *
 * 1. Register and login as a system admin
 * 2. Seed system with CDS rules across multiple organizations, departments, rule
 *    codes, including enabled/disabled states
 * 3. Search without filters -- expect all seeded rules returned (RBAC check: admin
 *    can view all)
 * 4. Search with organization_id and department_id filters -- expect correct
 *    scoping
 * 5. Perform sorted searches (created_at asc/desc, rule_code asc/desc), validate
 *    responses
 * 6. Paginate: use limit/page, validate results and pagination metadata
 * 7. Edge: search with no matching criteria -- expect empty results with valid
 *    pagination
 * 8. Permission check: attempt search as unauthenticated user -- expect error
 * 9. Error scenario: malformed query (e.g., invalid UUID format for org) -- expect
 *    validation error
 */
export async function test_api_decision_support_rule_search_by_sys_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: sysAdminEmail,
        password: sysAdminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(sysAdmin);

  // 2. Login as system admin (token auto-set)
  const sysAdminLogin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: sysAdminEmail,
        provider: "local",
        provider_key: sysAdminEmail,
        password: sysAdminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    });
  typia.assert(sysAdminLogin);

  // 3. Seed CDS rules for multiple orgs/depts
  const orgIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const depIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const seededRules: IHealthcarePlatformDecisionSupportRule[] = [];
  for (const organization_id of orgIds) {
    for (const department_id of depIds) {
      seededRules.push(
        await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.create(
          connection,
          {
            body: {
              organization_id,
              rule_code: RandomGenerator.alphaNumeric(8),
              title: RandomGenerator.paragraph({ sentences: 3 }),
              description: RandomGenerator.content({ paragraphs: 2 }),
              trigger_event: RandomGenerator.pick([
                "medication_prescribed",
                "lab_result_posted",
                "admission",
                "discharge",
              ] as const),
              expression_json: JSON.stringify({
                logic: RandomGenerator.paragraph({ sentences: 2 }),
              }),
              is_enabled: true,
            } satisfies IHealthcarePlatformDecisionSupportRule.ICreate,
          },
        ),
      );
      seededRules.push(
        await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.create(
          connection,
          {
            body: {
              organization_id,
              rule_code: RandomGenerator.alphaNumeric(8),
              title: RandomGenerator.paragraph({ sentences: 2 }),
              description: RandomGenerator.content({ paragraphs: 1 }),
              trigger_event: RandomGenerator.pick([
                "admission",
                "lab_result_posted",
              ] as const),
              expression_json: JSON.stringify({
                logic: RandomGenerator.paragraph({ sentences: 2 }),
              }),
              is_enabled: false,
            } satisfies IHealthcarePlatformDecisionSupportRule.ICreate,
          },
        ),
      );
    }
  }

  // 4. Search all rules -- empty filter (admin sees all)
  const allRulesPage: IPageIHealthcarePlatformDecisionSupportRule =
    await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.index(
      connection,
      {
        body: {} satisfies IHealthcarePlatformDecisionSupportRule.IRequest,
      },
    );
  typia.assert(allRulesPage);
  TestValidator.predicate(
    "admin sees all CDS rules",
    allRulesPage.data.length >= seededRules.length,
  );

  // 5. Search filtered by org/dep
  const targetOrg = orgIds[0];
  const targetDep = depIds[0];
  const expectedOrgDepRules = seededRules.filter(
    (r) => r.organization_id === targetOrg,
  );
  const filteredPage: IPageIHealthcarePlatformDecisionSupportRule =
    await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.index(
      connection,
      {
        body: {
          organization_id: targetOrg,
          // Simulating department scoping: not in ICreate, so cannot filter department, only org
        } satisfies IHealthcarePlatformDecisionSupportRule.IRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.equals(
    "all rules for target org",
    filteredPage.data.map((r) => r.organization_id),
    expectedOrgDepRules.map((r) => r.organization_id),
  );

  // 6. Sorted result checks (by created_at desc, rule_code asc)
  // created_at desc
  const descPage: IPageIHealthcarePlatformDecisionSupportRule =
    await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.index(
      connection,
      {
        body: {
          sort: "created_at desc",
        } satisfies IHealthcarePlatformDecisionSupportRule.IRequest,
      },
    );
  typia.assert(descPage);
  TestValidator.predicate(
    "sorted descending by created_at",
    descPage.data.every(
      (r, i, arr) => i === 0 || r.created_at <= arr[i - 1].created_at,
    ),
  );
  // rule_code asc
  const ascPage: IPageIHealthcarePlatformDecisionSupportRule =
    await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.index(
      connection,
      {
        body: {
          sort: "rule_code asc",
        } satisfies IHealthcarePlatformDecisionSupportRule.IRequest,
      },
    );
  typia.assert(ascPage);
  TestValidator.predicate(
    "sorted ascending by rule_code",
    ascPage.data.every(
      (r, i, arr) => i === 0 || r.rule_code >= arr[i - 1].rule_code,
    ),
  );

  // 7. Pagination test: limit=2, page=1 then page=2
  const pagedRules1 =
    await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.index(
      connection,
      {
        body: {
          limit: 2,
          page: 1,
          sort: "created_at desc",
        } satisfies IHealthcarePlatformDecisionSupportRule.IRequest,
      },
    );
  typia.assert(pagedRules1);
  TestValidator.equals(
    "pagination page 1 record count",
    pagedRules1.data.length,
    2,
  );
  if (pagedRules1.pagination.pages > 1) {
    const pagedRules2 =
      await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.index(
        connection,
        {
          body: {
            limit: 2,
            page: 2,
            sort: "created_at desc",
          } satisfies IHealthcarePlatformDecisionSupportRule.IRequest,
        },
      );
    typia.assert(pagedRules2);
    TestValidator.notEquals(
      "pagination page 2 records differ from page 1",
      pagedRules2.data.map((r) => r.id),
      pagedRules1.data.map((r) => r.id),
    );
  }

  // 8. No results query (impossible filter: random UUID org)
  const fakeOrgId = typia.random<string & tags.Format<"uuid">>();
  const noResultsPage =
    await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.index(
      connection,
      {
        body: {
          organization_id: fakeOrgId,
        } satisfies IHealthcarePlatformDecisionSupportRule.IRequest,
      },
    );
  typia.assert(noResultsPage);
  TestValidator.equals(
    "no rules for unknown organization",
    noResultsPage.data.length,
    0,
  );

  // 9. Unauthenticated access (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot search CDS rules",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.decisionSupportRules.index(
        unauthConn,
        {
          body: {} satisfies IHealthcarePlatformDecisionSupportRule.IRequest,
        },
      );
    },
  );

  // 10. Invalid query (malformed org UUID): type error scenario is ignored (cannot be compiled)
  // Instead: skip type error test, only business error
}
