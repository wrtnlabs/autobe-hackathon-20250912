import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProctoredExam";

export async function test_api_proctored_exam_corporate_learner_search_with_filters_and_pagination(
  connection: api.IConnection,
) {
  /**
   * 1. Create a new corporate learner using the join API.
   * 2. Login the corporate learner.
   * 3. Simulate an assessment ID.
   * 4. Prepare filter parameters for proctored exams.
   * 5. Call the PATCH proctored exams API with filters and pagination.
   * 6. Assert the correctness of the returned paginated proctored exams.
   * 7. Test unauthenticated access rejection.
   */

  // Step 1: Create a new corporate learner user
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const joinBody = {
    tenant_id: tenantId,
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const joinedUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedUser);

  // Step 2: Login as the created corporate learner
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const loggedInUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // Step 3: Simulate an assessment ID (UUID format)
  const assessmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 4: Define filter and pagination parameters
  const body: IEnterpriseLmsProctoredExam.IRequest = {
    page: 1,
    limit: 5,
    search: RandomGenerator.substring(
      "This is a sample search content to extract terms from.",
    ),
    status: RandomGenerator.pick([
      "scheduled",
      "in_progress",
      "completed",
      "cancelled",
    ] as const),
    assessment_id: assessmentId,
    orderBy: "created_at DESC",
  } satisfies IEnterpriseLmsProctoredExam.IRequest;

  // Step 5: Call PATCH endpoint to get filtered, paginated proctored exams
  const result: IPageIEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.corporateLearner.assessments.proctoredExams.index(
      connection,
      {
        assessmentId: assessmentId,
        body: body,
      },
    );
  typia.assert(result);

  // Step 6: Validate pagination info
  TestValidator.predicate(
    "pagination current page should match request",
    result.pagination.current === (body.page ?? 1),
  );

  TestValidator.predicate(
    "pagination limit should match request",
    result.pagination.limit === (body.limit ?? 5),
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    result.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    result.pagination.records >= 0,
  );

  // Step 7: Validate that each returned proctored exam matches the filtering criteria
  for (const exam of result.data) {
    TestValidator.equals(
      `proctored exam assessment_id matches filter for exam id ${exam.id}`,
      exam.assessment_id,
      assessmentId,
    );

    if (body.status !== null && body.status !== undefined) {
      TestValidator.equals(
        `proctored exam status matches filter for exam id ${exam.id}`,
        exam.status,
        body.status,
      );
    }
  }

  // Step 8: Test unauthenticated access rejection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access should be rejected",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.assessments.proctoredExams.index(
        unauthConn,
        {
          assessmentId: assessmentId,
          body: body,
        },
      );
    },
  );
}
