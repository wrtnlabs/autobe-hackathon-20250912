import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerComments";

/**
 * Tests updating a manager comment successfully as the comment's owner and
 * verifies that unauthorized managers cannot update others' comments.
 *
 * This test covers the authentication of manager users, the update of manager
 * comments by valid authors, and the enforcement of authorization restrictions
 * preventing unauthorized updates.
 *
 * Steps:
 *
 * 1. Create and authenticate a manager user.
 * 2. Create another manager user representing an unauthorized user.
 * 3. Perform a successful update to a manager comment by the authorized manager.
 * 4. Attempt the same update by the unauthorized manager and verify failure.
 *
 * This ensures both the update functionality and security constraints around
 * managerial comment modification are enforced properly.
 */
export async function test_api_manager_comment_update_success_and_authorization(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a manager user (authorized user)
  const managerEmail1: string = typia.random<string & tags.Format<"email">>();
  const manager1: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail1,
        password: "P@ssw0rd1234",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager1);

  // Step 2: Create and authenticate another manager user (unauthorized user)
  const managerEmail2: string = typia.random<string & tags.Format<"email">>();
  const manager2: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail2,
        password: "P@ssw0rd1234",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager2);

  // Prepare a fake existing manager comment ID and evaluation_cycle_id
  // Use realistic UUID random values
  const commentId: string = typia.random<string & tags.Format<"uuid">>();
  const evaluationCycleId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Perform a successful update by manager1 (authorized)
  // Build updated comment with new text content
  const updatedCommentText: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });

  const updatedComment: IJobPerformanceEvalManagerComments =
    await api.functional.jobPerformanceEval.manager.managerComments.update(
      connection,
      {
        id: commentId,
        body: {
          manager_id: manager1.id,
          evaluation_cycle_id: evaluationCycleId,
          comment: updatedCommentText,
        } satisfies IJobPerformanceEvalManagerComments.IUpdate,
      },
    );
  typia.assert(updatedComment);

  TestValidator.equals(
    "Updated comment id should match request",
    updatedComment.id,
    commentId,
  );
  TestValidator.equals(
    "Updated comment manager_id should match the authenticated manager",
    updatedComment.manager_id,
    manager1.id,
  );
  TestValidator.equals(
    "Updated comment evaluation_cycle_id should match input",
    updatedComment.evaluation_cycle_id,
    evaluationCycleId,
  );
  TestValidator.equals(
    "Updated comment text should reflect updated content",
    updatedComment.comment,
    updatedCommentText,
  );

  // Step 4: Attempt update by unauthorized manager2 (should fail)
  // Use manager2's authenticated context directly, no re-join call
  await TestValidator.error(
    "Unauthorized manager cannot update another's manager comment",
    async () => {
      await api.functional.jobPerformanceEval.manager.managerComments.update(
        connection,
        {
          id: commentId,
          body: {
            manager_id: manager2.id,
            evaluation_cycle_id: evaluationCycleId,
            comment: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 4,
              wordMax: 10,
            }),
          } satisfies IJobPerformanceEvalManagerComments.IUpdate,
        },
      );
    },
  );
}
