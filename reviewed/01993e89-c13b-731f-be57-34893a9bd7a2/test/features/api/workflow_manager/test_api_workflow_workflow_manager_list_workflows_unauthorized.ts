import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflow";

/**
 * Validate authorization failure on listing notification workflows without
 * login.
 *
 * This test verifies that accessing the notification workflow listing API
 * under workflowManager role without proper authentication fails
 * correctly.
 *
 * Steps:
 *
 * 1. Attempt to request the workflows list API without any prior
 *    authentication.
 * 2. Expect an authorization failure error (e.g., HTTP 401 Unauthorized).
 * 3. No dependencies required since we explicitly do NOT authenticate for this
 *    test.
 *
 * This test ensures that the security mechanism correctly prevents
 * unauthorized access to sensitive workflow data.
 */
export async function test_api_workflow_workflow_manager_list_workflows_unauthorized(
  connection: api.IConnection,
) {
  // Make a new connection with empty headers to simulate unauthorized access
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Prepare an empty filter request body with explicit nulls as all filters are nullable
  const requestBody = {
    code: null,
    name: null,
    is_active: null,
    entry_node_id: null,
    version: null,
    created_at: null,
    updated_at: null,
    deleted_at: null,
    page: null,
    limit: null,
  } satisfies INotificationWorkflowWorkflow.IRequest;

  // Expect the API call to fail due to authorization error
  await TestValidator.error(
    "should fail listing workflows without authentication",
    async () => {
      await api.functional.notificationWorkflow.workflowManager.workflows.index(
        unauthorizedConnection,
        {
          body: requestBody,
        },
      );
    },
  );
}
