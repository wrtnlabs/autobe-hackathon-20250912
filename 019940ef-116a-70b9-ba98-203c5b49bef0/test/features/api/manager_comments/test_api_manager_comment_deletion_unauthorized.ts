import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test unauthorized deletion attempt of a manager comment.
 *
 * This test generates a random manager comment ID and attempts to delete it
 * without authentication. It verifies that the API properly rejects the
 * request due to missing authentication headers, enforcing access control.
 *
 * Steps:
 *
 * 1. Generate random manager comment ID
 * 2. Attempt deletion without authenticating
 * 3. Expect an error indicating unauthorized access
 *
 * Ensures the deletion endpoint is protected and requires valid
 * authentication.
 */
export async function test_api_manager_comment_deletion_unauthorized(
  connection: api.IConnection,
) {
  // Generate a random manager comment ID (UUID) to attempt deletion
  const fakeManagerCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Attempt to delete the manager comment WITHOUT authenticating
  // Expect an error due to missing authentication / insufficient permission
  await TestValidator.error(
    "unauthorized manager comment deletion should fail",
    async () => {
      await api.functional.jobPerformanceEval.manager.managerComments.erase(
        connection,
        {
          id: fakeManagerCommentId,
        },
      );
    },
  );
}
