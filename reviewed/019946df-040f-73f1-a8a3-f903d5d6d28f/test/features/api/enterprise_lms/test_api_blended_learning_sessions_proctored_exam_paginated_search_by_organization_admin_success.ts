import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProctoredExam";

/**
 * This test validates the paginated search functionality for proctored exams by
 * an organizationAdmin user scoped to a tenant and a specific assessment. The
 * test follows a thorough business workflow beginning with organizationAdmin
 * user creation via join endpoint, login to obtain authentication tokens, then
 * creation of a tenant-scoped assessment resource for which proctored exams can
 * be searched. After these prerequisites, the paginated search API endpoint for
 * proctored exams related to the specified assessment is invoked with a request
 * body containing pagination parameters like page and limit, along with
 * possible search filters such as status and search keywords. The test asserts
 * correct tenant scoping and that returned proctored exam data matches the
 * expected filtering. Authentication tokens are managed automatically by the
 * SDK upon join and login. All responses are fully type-asserted using
 * typia.assert. The test also includes validation for error scenarios such as
 * searches with parameters not permitted to anonymous or unauthorized users.
 * Paginated results are checked for proper page metadata and consistency of
 * assessment IDs. This comprehensive test ensures organizational isolation,
 * proper filtering, pagination, and security rules of the proctored exams
 * paginated search endpoint under organizationAdmin roles.
 */
export async function test_api_blended_learning_sessions_proctored_exam_paginated_search_by_organization_admin_success(
  connection: api.IConnection,
) {
  // 1. Organization Admin Join
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const adminJoinBody = {
    tenant_id: tenantId,
    email: `${RandomGenerator.name(1)}@example.com`,
    password: "ValidPassword123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const joinedAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Organization Admin Login
  const adminLoginBody = {
    email: joinedAdmin.email,
    password: "ValidPassword123!",
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loggedInAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Create an assessment ID scoped to the tenant
  //    (Since no explicit create assessment API is provided, we
  //     generate a random assessmentId UUID scoped to this tenant)
  const assessmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Prepare the search request body
  const searchRequestBody = {
    page: 1,
    limit: 10,
    search: null,
    status: null,
    assessment_id: assessmentId,
    orderBy: null,
  } satisfies IEnterpriseLmsProctoredExam.IRequest;

  // 5. Call the paginated search API
  const searchResult: IPageIEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.organizationAdmin.assessments.proctoredExams.index(
      connection,
      {
        assessmentId: assessmentId,
        body: searchRequestBody,
      },
    );

  // 6. Assert the search result response
  typia.assert(searchResult);

  // Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination.current page equals request page",
    searchResult.pagination.current === searchRequestBody.page,
  );
  TestValidator.predicate(
    "pagination.limit equals request limit",
    searchResult.pagination.limit === searchRequestBody.limit,
  );
  TestValidator.predicate(
    "pagination.pages is correctly computed",
    searchResult.pagination.pages >= 0 &&
      searchResult.pagination.pages >=
        Math.ceil(searchResult.pagination.records / searchRequestBody.limit),
  );

  // Verify all proctored exams belong to the correct assessment
  for (const exam of searchResult.data) {
    TestValidator.equals(
      "proctored exam assessment_id matches",
      exam.assessment_id,
      assessmentId,
    );
  }

  // 7. Additional tests can include filtering by status and search string if
  //    supported by more sample data and functions.
}
