import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsReport";

/**
 * Validate department head analytics report listing with full join/login
 * context.
 *
 * This test mimics a real-world flow for a department head to fetch
 * analytics reports they created. It covers:
 *
 * 1. Registering a department head using unique email/password/identity (join,
 *    get token/account context)
 * 2. Logging in freshly created department head (ensures token issuance works
 *    for listing)
 * 3. Attempting to list reports with the dedicated endpoint, filtering by
 *    created_by_user_id/organization_id as appropriate
 * 4. Ensuring only authorized reports are listed (ownership/business boundary
 *    enforced)
 * 5. Negative/failure case: search with missing IDs or no assignment (ensures
 *    empty result, no leakage, or proper authorization error)
 * 6. Pagination and result structure validation
 */
export async function test_api_analytics_report_department_head_list_with_full_e2e_context(
  connection: api.IConnection,
) {
  // 1. Department head join (registration)
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const joinResponse = await api.functional.auth.departmentHead.join(
    connection,
    { body: joinRequest },
  );
  typia.assert(joinResponse);
  TestValidator.equals(
    "department head email matches request",
    joinResponse.email,
    joinRequest.email,
  );

  // 2. Login to verify auth context is valid
  const loginRequest = {
    email: joinRequest.email,
    password: joinRequest.password,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const loginResponse = await api.functional.auth.departmentHead.login(
    connection,
    { body: loginRequest },
  );
  typia.assert(loginResponse);
  TestValidator.equals(
    "login email matches join",
    loginResponse.email,
    joinRequest.email,
  );
  TestValidator.notEquals(
    "token after login differs",
    loginResponse.token.access,
    joinResponse.token.access,
  );

  // 3. Try to list analytics reports for this department head (should usually be empty for brand new user)
  const listRequest = {
    created_by_user_id: joinResponse.id,
    organization_id: joinResponse.id, // No true organization API context, so use user id (simulate org)
    page: 1,
    limit: 10,
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;

  const reportsPage =
    await api.functional.healthcarePlatform.departmentHead.analyticsReports.index(
      connection,
      { body: listRequest },
    );
  typia.assert(reportsPage);
  TestValidator.equals(
    "pagination current page is 1",
    reportsPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "reports list is array",
    Array.isArray(reportsPage.data),
  );
  // If no reports exist for a new user, result should be empty
  TestValidator.equals(
    "no analytics reports for new department head",
    reportsPage.data.length,
    0,
  );

  // 4. Negative: Attempt to list with missing user id (unauthorized context)
  const badListRequest = {
    page: 1,
    limit: 5,
  } satisfies IHealthcarePlatformAnalyticsReport.IRequest;

  // Should return empty or error according to business logic (implementation may allow empty array or throw error for missing identification)
  const badListPage =
    await api.functional.healthcarePlatform.departmentHead.analyticsReports.index(
      connection,
      { body: badListRequest },
    );
  typia.assert(badListPage);
  // Defensive: Length must be zero for data leakage protection
  TestValidator.equals(
    "empty analytics report result for missing identification",
    badListPage.data.length,
    0,
  );
}
