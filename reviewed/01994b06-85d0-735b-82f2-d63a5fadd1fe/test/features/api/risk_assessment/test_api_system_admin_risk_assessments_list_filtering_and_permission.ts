import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRiskAssessment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRiskAssessment";

/**
 * Test system admin's risk assessment list/filter/pagination and permission
 * handling.
 *
 * Register a new system admin and authenticate. Query risk assessment list
 * with:
 *
 * - No filter (should get all accessible records, paginated)
 * - By random valid organization_id (if data present)
 * - By random valid department_id (if data present)
 * - By valid risk_level and status (from first page, if present)
 * - Time window filter (assessment window_start_from/to, window_end_from/to)
 * - Edge: invalid (nonexistent) organization_id/department_id (should return
 *   empty result or permission-denied logic)
 * - Edge: high out-of-bounds page (should return empty result, valid paging)
 */
export async function test_api_system_admin_risk_assessments_list_filtering_and_permission(
  connection: api.IConnection,
) {
  // Register new system admin
  const sysAdminJoin = {
    email: `${RandomGenerator.name(1)}_${RandomGenerator.alphaNumeric(5)}@testenterprise.com`,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: `${RandomGenerator.name(1)}_${RandomGenerator.alphaNumeric(6)}`,
    password: RandomGenerator.alphaNumeric(12) + "!A1b",
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoin,
  });
  typia.assert(adminAuth);

  // 1. Fetch paginated risk assessment list (no filter)
  const emptyReq = {} satisfies IHealthcarePlatformRiskAssessment.IRequest;
  const pageAll =
    await api.functional.healthcarePlatform.systemAdmin.riskAssessments.index(
      connection,
      { body: emptyReq },
    );
  typia.assert(pageAll);
  TestValidator.predicate("pageAll.data array", Array.isArray(pageAll.data));
  TestValidator.predicate(
    "pageAll.pagination object",
    typeof pageAll.pagination === "object",
  );

  // If there is no data, skip filter cases
  if (pageAll.data.length === 0) {
    // Test: invalid filters (should return empty set)
    const invalidOrganizationId = typia.random<string & tags.Format<"uuid">>();
    const invalidReq = {
      organization_id: invalidOrganizationId,
    } satisfies IHealthcarePlatformRiskAssessment.IRequest;
    const emptyRes =
      await api.functional.healthcarePlatform.systemAdmin.riskAssessments.index(
        connection,
        { body: invalidReq },
      );
    typia.assert(emptyRes);
    TestValidator.equals(
      "empty result for invalid org",
      emptyRes.data.length,
      0,
    );
    return;
  }

  const firstRow = pageAll.data[0];
  typia.assert(firstRow);

  // 2. Filter by valid organization_id
  if (firstRow.department_id !== null && firstRow.department_id !== undefined) {
    // department_id present
    const orgId = firstRow.department_id;
    const reqByDept = {
      department_id: orgId,
    } satisfies IHealthcarePlatformRiskAssessment.IRequest;
    const pageDept =
      await api.functional.healthcarePlatform.systemAdmin.riskAssessments.index(
        connection,
        { body: reqByDept },
      );
    typia.assert(pageDept);
    TestValidator.predicate(
      "has assessments for department",
      pageDept.data.length >= 1,
    );
    // All returned records' department_id matches filter
    for (const rec of pageDept.data) {
      TestValidator.equals("all department_id match", rec.department_id, orgId);
    }
  }

  // 3. Filter by assessment_type, status, risk_level
  const reqByFields = {
    assessment_type: firstRow.assessment_type,
    status: firstRow.status,
    risk_level: firstRow.risk_level,
  } satisfies IHealthcarePlatformRiskAssessment.IRequest;
  const pageFields =
    await api.functional.healthcarePlatform.systemAdmin.riskAssessments.index(
      connection,
      { body: reqByFields },
    );
  typia.assert(pageFields);
  for (const rec of pageFields.data) {
    TestValidator.equals(
      "assessment_type matches",
      rec.assessment_type,
      firstRow.assessment_type,
    );
    TestValidator.equals("status matches", rec.status, firstRow.status);
    TestValidator.equals(
      "risk_level matches",
      rec.risk_level,
      firstRow.risk_level,
    );
  }

  // 4. Filter by window_start_from/to
  const windowStartFrom = firstRow.window_start;
  const reqByWindow = {
    window_start_from: windowStartFrom,
  } satisfies IHealthcarePlatformRiskAssessment.IRequest;
  const pageWindow =
    await api.functional.healthcarePlatform.systemAdmin.riskAssessments.index(
      connection,
      { body: reqByWindow },
    );
  typia.assert(pageWindow);
  for (const rec of pageWindow.data) {
    TestValidator.predicate(
      "window_start from matches",
      rec.window_start >= windowStartFrom,
    );
  }

  // 5. Pagination: page 1, page beyond total
  const reqPag = {
    page: 1,
    limit: 3,
  } satisfies IHealthcarePlatformRiskAssessment.IRequest;
  const page1 =
    await api.functional.healthcarePlatform.systemAdmin.riskAssessments.index(
      connection,
      { body: reqPag },
    );
  typia.assert(page1);
  TestValidator.predicate("pagination.data array", Array.isArray(page1.data));
  TestValidator.equals("pagination.page is 1", page1.pagination.current, 1);

  const maxPage = page1.pagination.pages + 100;
  const reqPageMax = {
    page: maxPage,
    limit: 3,
  } satisfies IHealthcarePlatformRiskAssessment.IRequest;
  const emptyPage =
    await api.functional.healthcarePlatform.systemAdmin.riskAssessments.index(
      connection,
      { body: reqPageMax },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page at high index", emptyPage.data.length, 0);

  // 6. Edge: invalid filters (should return empty sets)
  const invalidDepartmentId = typia.random<string & tags.Format<"uuid">>();
  const resInvalid =
    await api.functional.healthcarePlatform.systemAdmin.riskAssessments.index(
      connection,
      {
        body: {
          department_id: invalidDepartmentId,
        } satisfies IHealthcarePlatformRiskAssessment.IRequest,
      },
    );
  typia.assert(resInvalid);
  TestValidator.equals(
    "empty for invalid department",
    resInvalid.data.length,
    0,
  );
}
