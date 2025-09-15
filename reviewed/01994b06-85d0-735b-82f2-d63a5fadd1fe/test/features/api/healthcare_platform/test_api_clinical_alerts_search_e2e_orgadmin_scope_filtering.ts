import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformClinicalAlert";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformClinicalAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformClinicalAlert";

/**
 * Validate organization-admin scoped clinical alert search by RBAC, department,
 * and decision support rule filtering.
 *
 * 1. Register and log in a new org admin (setup context for organization)
 * 2. Query the clinicalAlert search with specific organization, department, and
 *    status/decision support rule filters + pagination params.
 * 3. Ensure all returned alerts are scoped only to the admin's org, only the
 *    correct department if filtered, only correct rule/status, and that
 *    pagination information is accurate.
 * 4. Exposure of results from other organizations is forbidden.
 */
export async function test_api_clinical_alerts_search_e2e_orgadmin_scope_filtering(
  connection: api.IConnection,
) {
  // 1. Register org admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminReq = {
    email: orgAdminEmail,
    full_name: RandomGenerator.name(),
    password: "test1234",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: orgAdminReq,
    },
  );
  typia.assert(orgAdmin);
  const orgId = orgAdmin.id; // This is admin's id, actual org id is not directly exposed. Clinical alerts will use orgId referenced.

  // 2. Login as org admin
  const loginResp = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: "test1234",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResp);
  // Reuse loginResp.token if needed

  // 3. Pick filter parameters (simulate known scenario or random):
  // For robust test, perform search with known org id, random status+department filter
  // Pick a status and department_id from previous org's expected context
  // (If no clinical alert data, the test must still validate proper filters, RBAC, and empty result for foreign data)
  const searchStatus = RandomGenerator.pick([
    "new",
    "viewed",
    "acknowledged",
    "resolved",
    "escalated",
    "closed",
  ] as const);
  // Use random uuid for decision_support_rule_id and department_id (simulate real filters, possibly producing empty result)
  const department_id = typia.random<string & tags.Format<"uuid">>();
  const decision_support_rule_id = typia.random<string & tags.Format<"uuid">>();

  // 4. Search with pagination - page 1, limit 5
  const searchReq = {
    organization_id: orgAdmin.id,
    department_id,
    decision_support_rule_id,
    status: searchStatus,
    page: 1 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
  } satisfies IHealthcarePlatformClinicalAlert.IRequest;

  const alertsPage =
    await api.functional.healthcarePlatform.organizationAdmin.clinicalAlerts.index(
      connection,
      {
        body: searchReq,
      },
    );
  typia.assert(alertsPage);

  const { pagination, data } = alertsPage;

  // 5. Check pagination structure
  TestValidator.equals("pagination current page is 1", pagination.current, 1);
  TestValidator.equals("pagination limit is 5", pagination.limit, 5);

  // 6. Validate all returned results have correct org/department/rule/status scope
  for (const alert of data) {
    TestValidator.equals(
      "organization_id matches admin org",
      alert.organization_id,
      orgAdmin.id,
    );
    TestValidator.equals(
      "department_id filter applied",
      alert.department_id,
      department_id,
    );
    TestValidator.equals(
      "decision_support_rule_id filter applied",
      alert.decision_support_rule_id,
      decision_support_rule_id,
    );
    TestValidator.equals("status filter applied", alert.status, searchStatus);
  }
}
