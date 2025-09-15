import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProctoredExam";

/**
 * This test function verifies the search and pagination functionality of
 * proctored exam sessions by assessment for a department manager in an
 * Enterprise LMS.
 *
 * The test covers user registration and login as a department manager,
 * preparing realistic search filter requests, and invoking the PATCH
 * endpoint to retrieve paginated proctored exam data linked to a specific
 * assessment.
 *
 * It validates that the returned data matches the assessment filter, the
 * pagination metadata is accurate, and that filtering parameters properly
 * restrict results.
 *
 * The test also verifies that only authorized department manager users can
 * access this endpoint, ensuring proper security enforcement.
 *
 * Steps:
 *
 * 1. Register a new department manager with realistic details.
 * 2. Login as the registered department manager.
 * 3. Prepare filter and pagination request bodies with valid status enums.
 * 4. Fetch paginated proctored exams using the PATCH endpoint with the
 *    assessmentId path parameter.
 * 5. Assert response data integrity, filtering, and pagination correctness.
 * 6. Verify unauthorized access is denied.
 */
export async function test_api_proctored_exam_search_by_assessment_with_pagination_and_filter(
  connection: api.IConnection,
) {
  // 1. Department manager registration
  const joinBody = {
    email: `dm_${RandomGenerator.alphaNumeric(6)}@enterprise.com`,
    password: "StrongPass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const joinedUser = await api.functional.auth.departmentManager.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(joinedUser);

  // 2. Department manager login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;

  const loggedInUser = await api.functional.auth.departmentManager.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedInUser);

  // 3. Define a realistic assessmentId for search
  const assessmentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare multiple search requests with different filters
  const searchRequests: IEnterpriseLmsProctoredExam.IRequest[] = [
    { page: 1, limit: 5, assessment_id: assessmentId },
    { page: 2, limit: 3, assessment_id: assessmentId, status: "scheduled" },
    { page: 1, limit: 10, assessment_id: assessmentId, search: "session" },
    {
      page: 1,
      limit: 5,
      assessment_id: assessmentId,
      orderBy: "created_at DESC",
    },
  ];

  for (const requestBody of searchRequests) {
    const response =
      await api.functional.enterpriseLms.departmentManager.assessments.proctoredExams.index(
        connection,
        {
          assessmentId: assessmentId,
          body: requestBody,
        },
      );
    typia.assert(response);

    // Validate pagination metadata
    TestValidator.predicate(
      "Pagination current page at least 1",
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "Pagination limit positive",
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      "Pagination records non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "Pagination pages non-negative",
      response.pagination.pages >= 0,
    );

    // Validate that all data items belong to the assessment
    for (const item of response.data) {
      TestValidator.equals(
        "Item matches assessment_id",
        item.assessment_id,
        assessmentId,
      );
    }

    // Validate filtering by status if applicable
    if (requestBody.status !== undefined && requestBody.status !== null) {
      TestValidator.predicate(
        "All items have requested status",
        response.data.every((exam) => exam.status === requestBody.status),
      );
    }

    // Validate search filter if applicable
    if (requestBody.search !== undefined && requestBody.search !== null) {
      // For simplicity, just check that some field contains the search term (case-insensitive)
      TestValidator.predicate(
        "Search term found in exam_session_id",
        response.data.every((exam) =>
          exam.exam_session_id
            .toLowerCase()
            .includes(requestBody.search!.toLowerCase()),
        ),
      );
    }
  }

  // 5. Unauthorized access test - simulate login with invalid token
  // Create a cloned connection with empty headers to simulate unauthorized
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "Unauthorized access to proctoredExams fails",
    async () => {
      await api.functional.enterpriseLms.departmentManager.assessments.proctoredExams.index(
        unauthorizedConnection,
        {
          assessmentId: assessmentId,
          body: { page: 1, limit: 1, assessment_id: assessmentId },
        },
      );
    },
  );
}
