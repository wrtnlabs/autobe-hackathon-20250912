import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerComments";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalManagerComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalManagerComments";

/**
 * This E2E test validates the security of the manager comments search API.
 *
 * It ensures that unauthorized access is properly denied by the system.
 *
 * Steps:
 *
 * 1. Perform manager join operation to satisfy prerequisite setup
 * 2. Attempt to search manager comments without authenticating
 * 3. Expect the search operation to throw an authorization error
 */
export async function test_api_manager_manager_comments_search_unauthorized(
  connection: api.IConnection,
) {
  // 1. Perform manager join to setup required user and authentication context
  const joinInput = {
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password: "Password123!",
    name: RandomGenerator.name(2),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const authorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, { body: joinInput });
  typia.assert(authorized);

  // 2. Attempt to search manager comments lacking authenticated manager credentials
  const searchBody = {
    page: 1,
    limit: 10,
    manager_id: null,
    evaluation_cycle_id: null,
    comment: null,
    orderBy: null,
  } satisfies IJobPerformanceEvalManagerComments.IRequest;

  await TestValidator.error(
    "Unauthorized search of manager comments should fail",
    async () => {
      await api.functional.jobPerformanceEval.manager.managerComments.searchManagerComments(
        connection,
        { body: searchBody },
      );
    },
  );
}
