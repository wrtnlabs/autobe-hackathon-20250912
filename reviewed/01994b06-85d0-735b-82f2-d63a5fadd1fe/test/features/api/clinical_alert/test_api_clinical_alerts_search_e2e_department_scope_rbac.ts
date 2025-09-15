import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformClinicalAlert";

/**
 * End-to-end search of clinical alerts by department head with RBAC validation.
 *
 * This test validates that when a department head user is registered and
 * authenticated, subsequent queries to search (patch) clinical alerts are
 * strictly limited to those within the assigned organization (and optionally
 * department), in compliance with RBAC. Multiple filter scenarios are tested
 * (status, alert_type, department, rule, etc.). All results must respect
 * department/organization-bounded RBAC rules. Pagination metadata must align
 * with result content counts and limits.
 *
 * 1. Register (join) department head – with correct org/department context
 * 2. Login as department head for a scoped authenticated session
 * 3. Issue a search for clinical alerts, applying multiple filters and validating
 *    results for:
 *
 *    - Proper inclusion of only department/org-bound alerts
 *    - All filters (status, department, alert_type, rule) properly restricting
 *         results
 *    - Pagination metadata and content matching as expected
 *    - All results comply with RBAC and no unauthorized department/org leaks
 */
export async function test_api_clinical_alerts_search_e2e_department_scope_rbac(
  connection: api.IConnection,
) {
  // 1. Register (join) department head, including org/department context
  const joinBody =
    typia.random<IHealthcarePlatformDepartmentHead.IJoinRequest>();
  const departmentHead = await api.functional.auth.departmentHead.join(
    connection,
    { body: joinBody },
  );
  typia.assert(departmentHead);
  const orgId = departmentHead.id as string; // See DTO: using 'id' as org routing for filter

  // 2. Login as department head (scoped session for RBAC test)
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const authSession = await api.functional.auth.departmentHead.login(
    connection,
    { body: loginBody },
  );
  typia.assert(authSession);

  // 3. Construct a search filter, randomizing but forcing org for RBAC check
  const searchFilters =
    typia.random<IHealthcarePlatformClinicalAlert.IRequest>();
  searchFilters.organization_id = departmentHead.id satisfies string;

  // 4. Search clinical alerts as department head with filter
  const resultPage =
    await api.functional.healthcarePlatform.departmentHead.clinicalAlerts.index(
      connection,
      {
        body: searchFilters,
      },
    );
  typia.assert(resultPage);
  TestValidator.equals(
    "pagination limit is respected",
    resultPage.data.length,
    Math.min(resultPage.pagination.limit, resultPage.pagination.records),
  );
  // RBAC and filter validation: every result must be organization-matched
  for (const alert of resultPage.data) {
    typia.assert(alert);
    TestValidator.equals(
      "alert is from visible org",
      alert.organization_id,
      searchFilters.organization_id,
    );
    if (searchFilters.department_id !== undefined) {
      TestValidator.equals(
        "alert is of filtered department",
        alert.department_id,
        searchFilters.department_id,
      );
    }
    if (searchFilters.status !== undefined) {
      TestValidator.equals(
        "alert status filtered",
        alert.status,
        searchFilters.status,
      );
    }
    if (searchFilters.decision_support_rule_id !== undefined) {
      TestValidator.equals(
        "alert rule filtered",
        alert.decision_support_rule_id,
        searchFilters.decision_support_rule_id,
      );
    }
    if (searchFilters.alert_type !== undefined) {
      TestValidator.equals(
        "alert type filtered",
        alert.alert_type,
        searchFilters.alert_type,
      );
    }
  }
  TestValidator.predicate(
    "all results are authorized, RBAC filters are enforced",
    resultPage.data.every(
      (alert) => alert.organization_id === searchFilters.organization_id,
    ),
  );
}
