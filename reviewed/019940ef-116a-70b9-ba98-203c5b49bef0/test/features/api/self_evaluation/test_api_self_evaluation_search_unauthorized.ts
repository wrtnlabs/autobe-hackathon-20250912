import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalSelfEvaluation";

/**
 * Validate that unauthorized access to employee self-evaluation search API
 * is rejected.
 *
 * This test covers the security measure ensuring that only authenticated
 * managers can retrieve employee self-evaluation records. It does so by
 * performing a valid manager join (to satisfy prerequisites) and then
 * attempts to call the search API without authentication.
 *
 * The expected behavior is an HTTP error due to lack of authorization.
 *
 * Steps:
 *
 * 1. Perform POST /auth/manager/join to create a manager account.
 * 2. Establish an unauthenticated connection with empty headers.
 * 3. Attempt to call PATCH /jobPerformanceEval/manager/selfEvaluations with
 *    empty filter.
 * 4. Expect a HTTP error (typically 401 Unauthorized or 403 Forbidden).
 */
export async function test_api_self_evaluation_search_unauthorized(
  connection: api.IConnection,
) {
  // 1. Perform manager join to satisfy prerequisites
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = "Password123!";
  const managerBody = {
    email: managerEmail,
    password: managerPassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const authorizedManager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerBody,
    });
  typia.assert(authorizedManager);

  // 2. Create unauthenticated connection to simulate unauthorized access
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Attempt to search self evaluations without authentication
  await TestValidator.error(
    "unauthorized searchSelfEvaluations call must fail",
    async () => {
      await api.functional.jobPerformanceEval.manager.selfEvaluations.searchSelfEvaluations(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );
}
