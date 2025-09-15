import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerComments";

/**
 * Test retrieving detailed information of a manager comment by its unique ID.
 *
 * This test covers:
 *
 * 1. Successful retrieval by an authorized manager user.
 * 2. Attempted retrieval by unauthorized access failing.
 * 3. Attempted retrieval of non-existent comment failing.
 *
 * Workflow:
 *
 * - Create a manager user via /auth/manager/join to obtain JWT tokens.
 * - Use the obtained authentication context to request the manager comment
 *   detail.
 * - Perform validations on data correctness and access control.
 *
 * Validates that authorization is enforced strictly and data integrity is
 * maintained.
 */
export async function test_api_manager_comment_retrieval_success_and_authorization(
  connection: api.IConnection,
) {
  // 1. Manager user creation (join and authentication)
  const createManagerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const managerAuth: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: createManagerBody,
    });
  typia.assert(managerAuth);

  // 2. Successful retrieval of a manager comment by an authorized user
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Try to retrieve manager comment - simulate realistic existing ID usage
  const comment: IJobPerformanceEvalManagerComments =
    await api.functional.jobPerformanceEval.manager.managerComments.atManagerComment(
      connection,
      { id: commentId },
    );
  typia.assert(comment);

  // Validate that retrieved comment matches the requested id
  TestValidator.equals(
    "manager comment id matches requested",
    comment.id,
    commentId,
  );

  // 3. Unauthorized access attempt should fail
  // Prepare a separate unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized manager comment retrieval should fail",
    async () => {
      await api.functional.jobPerformanceEval.manager.managerComments.atManagerComment(
        unauthConn,
        { id: commentId },
      );
    },
  );

  // 4. Retrieval with non-existent comment id should fail
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieval of non-existent manager comment should fail",
    async () => {
      await api.functional.jobPerformanceEval.manager.managerComments.atManagerComment(
        connection,
        { id: nonExistentId },
      );
    },
  );
}
