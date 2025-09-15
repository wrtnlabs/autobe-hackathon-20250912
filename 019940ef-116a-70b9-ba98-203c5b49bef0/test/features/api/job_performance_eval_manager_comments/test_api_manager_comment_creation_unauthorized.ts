import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerComments";

/**
 * Test manager comment creation without authentication token to verify the API
 * rejects unauthorized creation attempts.
 *
 * This test performs a manager account creation to obtain a valid manager_id,
 * then attempts to create a manager comment without authorization. It expects
 * the comment creation API to reject unauthorized attempts and throw an error.
 *
 * Steps:
 *
 * 1. Register a manager account (auth.manager.join) to get a manager_id.
 * 2. Attempt to create a manager comment with valid data but using an
 *    unauthenticated connection.
 * 3. Validate that the API call throws an error indicating unauthorized access.
 */
export async function test_api_manager_comment_creation_unauthorized(
  connection: api.IConnection,
) {
  // 1. Create manager account (auth.manager.join)
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const managerAuth: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(managerAuth);

  // 2. Prepare unauthenticated connection without auth headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Construct valid manager comment create body
  const commentCreateBody = {
    manager_id: managerAuth.id,
    evaluation_cycle_id: typia.random<string & tags.Format<"uuid">>(),
    comment: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 6,
      wordMax: 12,
    }),
  } satisfies IJobPerformanceEvalManagerComments.ICreate;

  // 4. Attempt to create manager comment without authorization, expecting failure
  await TestValidator.error(
    "manager comment creation without auth should fail",
    async () => {
      await api.functional.jobPerformanceEval.manager.managerComments.create(
        unauthenticatedConnection,
        { body: commentCreateBody },
      );
    },
  );
}
