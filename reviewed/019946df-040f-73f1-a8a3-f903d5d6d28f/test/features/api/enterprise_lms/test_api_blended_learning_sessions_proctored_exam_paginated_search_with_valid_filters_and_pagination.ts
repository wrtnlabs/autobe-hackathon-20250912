import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProctoredExam";

/**
 * End-to-end validation of the proctored exams paginated search for
 * systemAdmin user.
 *
 * This test covers the following steps:
 *
 * 1. Registers a systemAdmin user by calling the join endpoint with realistic
 *    data.
 * 2. Logs in as that systemAdmin user to acquire authentication tokens.
 * 3. Uses the authorized connection to prepare a valid assessmentId for
 *    searching proctored exams. Since the real assessment creation is
 *    unavailable, generates a random UUID placeholder.
 * 4. Performs a paginated search with filters such as exam_session_id and
 *    proctor_id.
 * 5. Verifies that the pagination metadata matches requested parameters.
 * 6. Iterates through multiple pages to confirm pagination correctness.
 * 7. Ensures that returned proctored exams match search filters accurately.
 * 8. Checks error scenarios such as unauthorized access.
 *
 * This test ensures that the systemAdmin user can successfully filter and
 * page through proctored exams according to business rules, with all DTO
 * validations and type safety guaranteed.
 */
export async function test_api_blended_learning_sessions_proctored_exam_paginated_search_with_valid_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. systemAdmin user registration
  const systemAdminCreateBody = {
    email: RandomGenerator.alphabets(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. systemAdmin user login
  const loginBody = {
    email: systemAdmin.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const loggedInAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // Use returned token in connection (handled automatically by SDK)

  // 3. Prepare a valid assessmentId for testing proctored exams search
  const assessmentId = typia.random<string & tags.Format<"uuid">>();

  // Helper function to validate proctored exam list matches filter
  function validateProctoredExamsMatch(
    exams: IEnterpriseLmsProctoredExam[],
    filterBody: IEnterpriseLmsProctoredExam.IRequest,
  ): void {
    for (const exam of exams) {
      typia.assert(exam);
      if (
        filterBody.search !== null &&
        filterBody.search !== undefined &&
        filterBody.search.length > 0
      ) {
        const searchLower = filterBody.search.toLowerCase();
        const examSessionLower = exam.exam_session_id.toLowerCase();
        const proctorLower = (exam.proctor_id ?? "").toLowerCase();
        TestValidator.predicate(
          `exam session or proctor id includes search ("${filterBody.search}")`,
          examSessionLower.includes(searchLower) ||
            proctorLower.includes(searchLower),
        );
      }
      if (filterBody.status !== null && filterBody.status !== undefined) {
        TestValidator.equals(
          `exam status equals filter`,
          exam.status,
          filterBody.status,
        );
      }
      TestValidator.equals(
        "exam assessment_id matches assessmentId",
        exam.assessment_id,
        assessmentId,
      );
    }
  }

  // 4. Perform paginated search with valid filters
  const pageSize = 3;
  const firstFilterBody = {
    page: 1,
    limit: pageSize,
    search: null,
    status: "scheduled",
    assessment_id: assessmentId,
    orderBy: "created_at DESC",
  } satisfies IEnterpriseLmsProctoredExam.IRequest;

  const firstPageResult: IPageIEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.index(
      connection,
      {
        assessmentId,
        body: firstFilterBody,
      },
    );
  typia.assert(firstPageResult);
  TestValidator.equals(
    "pagination current page is 1",
    firstPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is as requested",
    firstPageResult.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "pagination total records is non-negative",
    firstPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages non-negative",
    firstPageResult.pagination.pages >= 0,
  );

  // Validate returned exams match filter
  validateProctoredExamsMatch(firstPageResult.data, firstFilterBody);

  // 5. If there are multiple pages, load the next page and verify
  if (firstPageResult.pagination.pages > 1) {
    const secondFilterBody = {
      ...firstFilterBody,
      page: 2,
    } satisfies IEnterpriseLmsProctoredExam.IRequest;

    const secondPageResult: IPageIEnterpriseLmsProctoredExam =
      await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.index(
        connection,
        {
          assessmentId,
          body: secondFilterBody,
        },
      );
    typia.assert(secondPageResult);

    TestValidator.equals(
      "pagination current page is 2",
      secondPageResult.pagination.current,
      2,
    );
    TestValidator.equals(
      "pagination limit is as requested",
      secondPageResult.pagination.limit,
      pageSize,
    );
    TestValidator.predicate(
      "pagination total records consistent between pages",
      secondPageResult.pagination.records ===
        firstPageResult.pagination.records,
    );

    validateProctoredExamsMatch(secondPageResult.data, secondFilterBody);
  }

  // 6. Test filter by partial exam_session_id search
  const searchString =
    firstPageResult.data.length > 0
      ? firstPageResult.data[0].exam_session_id.substring(0, 4)
      : "abcd";

  const searchFilterBody = {
    ...firstFilterBody,
    page: 1,
    limit: pageSize,
    search: searchString,
  } satisfies IEnterpriseLmsProctoredExam.IRequest;

  const searchResult =
    await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.index(
      connection,
      {
        assessmentId,
        body: searchFilterBody,
      },
    );
  typia.assert(searchResult);
  validateProctoredExamsMatch(searchResult.data, searchFilterBody);

  // 7. Test unauthorized access should result in error
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized access should error", async () => {
    await api.functional.enterpriseLms.systemAdmin.assessments.proctoredExams.index(
      unauthorizedConnection,
      {
        assessmentId,
        body: firstFilterBody,
      },
    );
  });
}
