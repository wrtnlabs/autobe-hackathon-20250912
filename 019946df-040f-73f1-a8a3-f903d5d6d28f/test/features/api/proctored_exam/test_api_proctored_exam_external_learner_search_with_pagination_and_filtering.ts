import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsProctoredExam";

/**
 * End-to-end test for external learner searching proctored exams with
 * pagination and filtering.
 *
 * This test covers the complete flow of registering an external learner,
 * authenticating, and fetching a filtered, paginated list of proctored
 * exams linked to a specific assessment. It validates response pagination,
 * filtering correctness, and ensures unauthorized requests are properly
 * rejected.
 *
 * Steps:
 *
 * 1. Register a new external learner user.
 * 2. Use obtained tokens for authorization (handled automatically).
 * 3. Define an assessment ID to search exams for.
 * 4. Request the paginated proctored exams list with filters.
 * 5. Validate pagination and filter correctness in response.
 * 6. Attempt an unauthorized request to verify error handling.
 */
export async function test_api_proctored_exam_external_learner_search_with_pagination_and_filtering(
  connection: api.IConnection,
) {
  // Step 1: Register an external learner
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  const joinedLearner: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      { body: joinBody },
    );
  typia.assert(joinedLearner);

  // Step 2: Use tokens for authentication - the SDK manages headers automatically

  // Step 3: Use assessmentId from an existing or random UUID
  const assessmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 4: Prepare search/filter request body
  const requestBody = {
    page: 1,
    limit: 10,
    search: null,
    status: "scheduled",
    assessment_id: assessmentId,
    orderBy: "scheduled_at DESC",
  } satisfies IEnterpriseLmsProctoredExam.IRequest;

  // Step 5: Perform the PATCH call
  const response: IPageIEnterpriseLmsProctoredExam =
    await api.functional.enterpriseLms.externalLearner.assessments.proctoredExams.index(
      connection,
      {
        assessmentId,
        body: requestBody,
      },
    );
  typia.assert(response);

  // Step 6: Validate pagination metadata
  TestValidator.predicate(
    "response pagination current page matches request",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "response pagination limit matches request",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "response pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "response pagination total pages non-negative",
    response.pagination.pages >= 0,
  );

  // Confirm all proctored exams belong to the assessmentId and meet filter criteria
  for (const exam of response.data) {
    typia.assert(exam);
    TestValidator.equals(
      "proctored exam assessment ID matches",
      exam.assessment_id,
      assessmentId,
    );
    TestValidator.equals(
      "proctored exam status matches filter",
      exam.status,
      "scheduled",
    );
  }

  // Step 7: Test unauthorized access: create unauthenticated connection
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized request without token should fail",
    async () => {
      await api.functional.enterpriseLms.externalLearner.assessments.proctoredExams.index(
        unauthenticatedConn,
        {
          assessmentId,
          body: requestBody,
        },
      );
    },
  );
}
