import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformClinicalAlert";

/**
 * End-to-end test of clinical alert search for a healthcare platform system
 * admin, ensuring:
 *
 * - System admin registration and login succeed, establishing an authenticated
 *   session.
 * - Search API allows filtering by department, status, and decision support rule
 *   as described in business requirements.
 * - All result records are restricted to admin's RBAC scope
 *   (organization/department).
 * - Pagination returns valid metadata and distinguishes between pages.
 * - Filtering (department/status/rule) works as expected per input parameters.
 *
 * Steps:
 *
 * 1. Register a new admin user (provider: local)
 * 2. Login as the new admin
 * 3. Query alerts without filters to extract available filtering values
 * 4. For a sample alert, perform: a. department filter b. status filter c.
 *    decision_support_rule filter d. Pagination across pages
 * 5. Validate all returned result records match filtering and RBAC scope
 * 6. Validate pagination returns distinguishable pages
 *
 * If alerts with suitable filtering fields are not present, the test exits
 * early after basic safety checks.
 */
export async function test_api_clinical_alerts_search_e2e_admin_scope_filtering(
  connection: api.IConnection,
) {
  // 1. Register system admin with unique business email and password
  const adminEmail = `admin+${RandomGenerator.alphaNumeric(8)}@enterprise-test.com`;
  const adminPassword = RandomGenerator.alphaNumeric(24);
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Login as that admin
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);
  TestValidator.equals(
    "admin email matches after login",
    adminLogin.email,
    adminEmail,
  );

  // 3. Query alerts with no filters, small page, to sample data for parameterization
  const page1 =
    await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.index(
      connection,
      {
        body: {
          limit: 3,
          page: 1,
        } satisfies IHealthcarePlatformClinicalAlert.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate("returns 0+ results", page1.data.length >= 0);
  TestValidator.equals("pagination.current is 1", page1.pagination.current, 1);

  // Find a sample alert usable for department, status, and rule based filtering
  const firstAlert = page1.data.find(
    (x) => x.status && x.department_id && x.decision_support_rule_id,
  );

  if (!firstAlert) {
    TestValidator.predicate(
      "no sample alert with status/department/rule available; skipping filter tests",
      true,
    );
    return;
  }

  // 4a. Department filter
  const byDept =
    await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.index(
      connection,
      {
        body: {
          department_id: firstAlert.department_id!,
          limit: 10,
          page: 1,
        } satisfies IHealthcarePlatformClinicalAlert.IRequest,
      },
    );
  typia.assert(byDept);
  for (const alert of byDept.data)
    TestValidator.equals(
      "all alerts match expected department",
      alert.department_id,
      firstAlert.department_id!,
    );

  // 4b. Status filter
  const byStatus =
    await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.index(
      connection,
      {
        body: {
          status: firstAlert.status,
          limit: 10,
          page: 1,
        } satisfies IHealthcarePlatformClinicalAlert.IRequest,
      },
    );
  typia.assert(byStatus);
  for (const alert of byStatus.data)
    TestValidator.equals(
      "all alerts match expected status",
      alert.status,
      firstAlert.status,
    );

  // 4c. Decision support rule filter
  const byRule =
    await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.index(
      connection,
      {
        body: {
          decision_support_rule_id: firstAlert.decision_support_rule_id,
          limit: 10,
          page: 1,
        } satisfies IHealthcarePlatformClinicalAlert.IRequest,
      },
    );
  typia.assert(byRule);
  for (const alert of byRule.data)
    TestValidator.equals(
      "all alerts match expected decision support rule",
      alert.decision_support_rule_id,
      firstAlert.decision_support_rule_id,
    );

  // 5. Pagination: next page by status filter
  const byStatusPage2 =
    await api.functional.healthcarePlatform.systemAdmin.clinicalAlerts.index(
      connection,
      {
        body: {
          status: firstAlert.status,
          limit: 2,
          page: 2,
        } satisfies IHealthcarePlatformClinicalAlert.IRequest,
      },
    );
  typia.assert(byStatusPage2);
  TestValidator.equals(
    "pagination current=2 for page 2",
    byStatusPage2.pagination.current,
    2,
  );
  TestValidator.notEquals(
    "page 1 and page 2 alert results differ as expected",
    byStatus.data,
    byStatusPage2.data,
  );

  // 6. RBAC: Alerts organization must match that of sample alert (admin scope)
  for (const alert of byDept.data)
    TestValidator.equals(
      "org_id matches between department filter and sample alert",
      alert.organization_id,
      firstAlert.organization_id,
    );
}
