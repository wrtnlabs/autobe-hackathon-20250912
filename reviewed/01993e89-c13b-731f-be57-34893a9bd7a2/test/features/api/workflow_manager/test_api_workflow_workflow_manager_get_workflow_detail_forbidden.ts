import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * Test forbidden access when a workflowManager user attempts to retrieve a
 * workflow that they are not authorized to access.
 *
 * This test performs the following steps:
 *
 * 1. Authenticate a workflowManager user via the join endpoint.
 * 2. Attempt to fetch the details of a notification workflow by a given
 *    workflowId which the authenticated user is not authorized for.
 * 3. Confirm that the API call results in a 403 Forbidden error, verifying
 *    that the access control prevents unauthorized retrieval.
 *
 * This enforces security constraints and ensures only authorized workflow
 * managers can view specific workflow details.
 */
export async function test_api_workflow_workflow_manager_get_workflow_detail_forbidden(
  connection: api.IConnection,
) {
  // Step 1: Authenticate a workflowManager user
  const user = await api.functional.auth.workflowManager.join(connection, {
    body: {
      email: `forbidden_test_${RandomGenerator.alphaNumeric(6)}@example.com`,
      password_hash: RandomGenerator.alphaNumeric(16),
    } satisfies INotificationWorkflowWorkflowManager.ICreate,
  });
  typia.assert(user);

  // Step 2: Attempt to fetch workflow detail by a random UUID that the user shouldn't have access to
  const forbiddenWorkflowId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Expect forbidden error (403) when accessing unauthorized workflow
  await TestValidator.error(
    "WorkflowManager forbidden to access unauthorized workflow",
    async () => {
      await api.functional.notificationWorkflow.workflowManager.workflows.at(
        connection,
        {
          workflowId: forbiddenWorkflowId,
        },
      );
    },
  );
}
