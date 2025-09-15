import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEvaluationSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationSnapshots";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalEvaluationSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEvaluationSnapshots";

/**
 * Unauthorized Access Failure Test for Evaluation Snapshots Retrieval.
 *
 * This E2E test ensures that the job performance evaluation snapshots
 * endpoint correctly rejects unauthenticated or unauthorized access
 * attempts.
 *
 * Business Context: Evaluation snapshots contain sensitive employee
 * performance data only accessible to authorized manager roles. This test
 * confirms that access control mechanisms are properly enforced.
 *
 * Test Workflow:
 *
 * 1. Perform manager account creation (join) to ensure manager user exists.
 * 2. Attempt to call the evaluationSnapshots index PATCH endpoint without
 *    valid authentication token.
 * 3. Attempt to call the same endpoint with an empty authorization header.
 * 4. Expect both calls to fail with HTTP 401 Unauthorized errors.
 * 5. Validate that error details conform to HttpError structure.
 */
export async function test_api_evaluation_snapshots_search_unauthorized_access_failure(
  connection: api.IConnection,
) {
  // Step 1: Create the manager account to establish role
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = "password1234";
  const managerCreationBody = {
    email: managerEmail,
    password: managerPassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  await api.functional.auth.manager.join(connection, {
    body: managerCreationBody,
  });

  // Prepare calls to evaluationSnapshots without authentication

  // Async helper to attempt API call expecting HTTP 401 error
  async function attemptUnauthorizedCall(authHeader?: string) {
    const unauthConnection: api.IConnection = { ...connection, headers: {} };
    if (authHeader !== undefined) {
      unauthConnection.headers = { Authorization: authHeader };
    }

    await TestValidator.httpError(
      "should fail with 401 unauthorized error",
      401,
      async () => {
        await api.functional.jobPerformanceEval.manager.evaluationSnapshots.index(
          unauthConnection,
          {
            body: {} satisfies IJobPerformanceEvalEvaluationSnapshots.IRequest,
          },
        );
      },
    );
  }

  // Step 2: Call without any Authorization header
  await attemptUnauthorizedCall();

  // Step 3: Call with empty Authorization header
  await attemptUnauthorizedCall("");
}
