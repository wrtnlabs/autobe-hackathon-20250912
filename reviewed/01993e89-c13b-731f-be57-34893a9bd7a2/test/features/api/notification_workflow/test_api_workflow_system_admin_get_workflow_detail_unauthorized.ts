import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";

/**
 * Verify unauthorized access prevention for systemAdmin workflow details
 * endpoint.
 *
 * This test function ensures that when an unauthenticated (no systemAdmin
 * token) connection tries to get details of a notification workflow, the
 * API correctly returns an unauthorized error.
 *
 * Workflow:
 *
 * 1. Execute required systemAdmin join operation to initialize the systemAdmin
 *    role context.
 * 2. Create a connection object without authentication headers.
 * 3. Attempt to retrieve the workflow details by calling GET
 *    /notificationWorkflow/systemAdmin/workflows/{workflowId} with a random
 *    valid UUID.
 * 4. Confirm that an authorization error occurs.
 */
export async function test_api_workflow_system_admin_get_workflow_detail_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Authenticate a systemAdmin to setup initial context
  await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: RandomGenerator.alphaNumeric(10) + "@example.com",
      password: "P@ssw0rd!",
    } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
  });

  // Step 2: Create a new connection that simulates unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 3: Attempt to get workflow details without auth and expect error
  const workflowId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("unauthorized access should fail", async () => {
    // API call expected to throw unauthorized HttpError
    await api.functional.notificationWorkflow.systemAdmin.workflows.at(
      unauthConn,
      { workflowId },
    );
  });
}
