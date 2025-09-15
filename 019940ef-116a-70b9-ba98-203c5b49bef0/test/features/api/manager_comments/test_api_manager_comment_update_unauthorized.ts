import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerComments";

/**
 * Test unauthorized update attempt to a manager comment record without
 * proper authentication.
 *
 * Validates that updating a manager comment without valid authentication
 * tokens is forbidden and rejected by the API. This ensures security
 * enforcement on sensitive managerial data updates.
 *
 * Workflow:
 *
 * 1. Perform manager account join operation as authentication prerequisite.
 * 2. Attempt to update a manager comment with a random UUID using an
 *    unauthorized connection that has no authentication headers.
 * 3. Assert that the update API call throws an authorization error.
 */
export async function test_api_manager_comment_update_unauthorized(
  connection: api.IConnection,
) {
  // 1. Manager join (authentication prerequisite)
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const managerAuthorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(managerAuthorized);

  // 2. Attempt update without authentication
  // Create a fresh unauthorized connection without authentication headers
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Prepare update body with random comment
  const updateBody = {
    comment: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IJobPerformanceEvalManagerComments.IUpdate;

  // Use random UUID for manager comment id
  const updateId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Call update API expecting unauthorized error
  await TestValidator.error(
    "unauthorized update attempt should fail",
    async () => {
      await api.functional.jobPerformanceEval.manager.managerComments.update(
        unauthorizedConnection,
        {
          id: updateId,
          body: updateBody,
        },
      );
    },
  );
}
