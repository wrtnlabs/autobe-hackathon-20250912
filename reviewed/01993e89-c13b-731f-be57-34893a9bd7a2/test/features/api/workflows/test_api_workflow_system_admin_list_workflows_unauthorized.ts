import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkflow";

/**
 * Verify that the workflows listing endpoint rejects requests without
 * proper system admin authentication.
 *
 * This test ensures unauthorized users cannot access the workflows list and
 * that the API enforces security constraints.
 *
 * Steps:
 *
 * 1. Join as system admin to create authorization credentials.
 * 2. Create an unauthenticated connection (no auth headers).
 * 3. Attempt to list workflows with unauthenticated connection.
 * 4. Confirm the call fails with unauthorized HTTP error (401).
 */
export async function test_api_workflow_system_admin_list_workflows_unauthorized(
  connection: api.IConnection,
) {
  // 1. System admin joins (authenticate and acquire token)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  await api.functional.auth.systemAdmin.join(connection, { body: joinBody });

  // 2. Create unauthenticated connection, clearing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Prepare empty filter body for workflows listing
  const workflowsFilterBody =
    {} satisfies INotificationWorkflowWorkflow.IRequest;

  // 4. Attempt to call listing API without authentication - expect HttpError 401
  await TestValidator.httpError(
    "unauthorized workflows listing should fail",
    401,
    async () => {
      await api.functional.notificationWorkflow.systemAdmin.workflows.index(
        unauthConn,
        { body: workflowsFilterBody },
      );
    },
  );
}
