import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerComments";

/**
 * Test unauthorized access to retrieve manager comment detail.
 *
 * This test validates that the system rejects requests to retrieve a
 * manager comment detail when the request lacks proper authentication
 * credentials. The test:
 *
 * 1. Executes the prerequisite manager join operation to ensure the system has
 *    at least one manager user set up.
 * 2. Attempts to retrieve a manager comment by a randomly generated valid
 *    UUID, but without any authentication (i.e., unauthenticated
 *    connection).
 * 3. Validates that the operation fails by throwing an HttpError with status
 *    401 or an error indicating unauthorized access.
 *
 * This test enforces the security requirement that manager comment details
 * can only be accessed by authenticated users with manager role.
 */
export async function test_api_manager_comment_retrieval_unauthorized(
  connection: api.IConnection,
) {
  // 1. Prepare manager join to ensure system has a manager user
  const joinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "Passw0rd!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const joinOutput = await api.functional.auth.manager.join(connection, {
    body: joinBody,
  });
  typia.assert(joinOutput);

  // 2. Attempt to retrieve a manager comment by UUID without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const randomManagerCommentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "unauthorized retrieval of manager comment should fail",
    async () => {
      await api.functional.jobPerformanceEval.manager.managerComments.atManagerComment(
        unauthenticatedConnection,
        { id: randomManagerCommentId },
      );
    },
  );
}
