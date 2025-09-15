import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test deleting a manager comment by its unique ID with an authorized manager
 * user.
 *
 * The test first creates and authenticates a manager user via
 * /auth/manager/join. Then it deletes a valid manager comment with their
 * authorization. It confirms successful deletion returns no content.
 *
 * It also tests deletion attempt without authentication, which must be
 * rejected.
 */
export async function test_api_manager_comment_deletion_success_and_authorization(
  connection: api.IConnection,
) {
  // Create and authenticate a manager user
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const managerCreateBody = {
    email: managerEmail,
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const managerAuthorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(managerAuthorized);

  // Authorized deletion of a manager comment (using random uuid as comment id)
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await api.functional.jobPerformanceEval.manager.managerComments.erase(
    connection,
    {
      id: commentId,
    },
  );

  // Attempt deletion without authentication must fail
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "deletion without authentication should fail",
    async () => {
      await api.functional.jobPerformanceEval.manager.managerComments.erase(
        unauthConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
