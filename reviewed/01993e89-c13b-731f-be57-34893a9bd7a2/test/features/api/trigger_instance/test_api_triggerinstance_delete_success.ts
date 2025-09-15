import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";

/**
 * Validates successful deletion of a TriggerInstance by an authorized
 * system administrator user.
 *
 * This E2E test performs the complete operation sequence:
 *
 * 1. Creating a system administrator user (join) to establish authentication.
 * 2. Logging in as the system administrator to obtain authentication token.
 * 3. Creating a notification workflow, which is necessary for creating a
 *    TriggerInstance.
 * 4. Creating a TriggerInstance linked to the created notification workflow.
 * 5. Deleting the created TriggerInstance, verifying successful deletion.
 *
 * The test ensures all operations complete without error and data integrity
 * is maintained.
 */
export async function test_api_triggerinstance_delete_success(
  connection: api.IConnection,
) {
  // 1. Create system administrator user (join)
  const systemAdminJoinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@domain.com",
    password: RandomGenerator.alphaNumeric(12),
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;
  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminJoinBody,
    });
  typia.assert(systemAdmin);

  // 2. Login as system administrator user
  const systemAdminLoginBody = {
    email: systemAdmin.email,
    password: systemAdminJoinBody.password,
  } satisfies INotificationWorkflowSystemAdmin.IRequestLogin;
  const loggedInAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Create a notification workflow
  const workflowCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    is_active: true,
    entry_node_id: typia.random<string & tags.Format<"uuid">>(),
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;
  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      {
        body: workflowCreateBody,
      },
    );
  typia.assert(workflow);

  // 4. Create a TriggerInstance tied to the created workflow
  const idempotencyKey = RandomGenerator.alphaNumeric(20);
  const triggerInstanceCreateBody = {
    workflow_id: workflow.id,
    idempotency_key: idempotencyKey,
    payload: JSON.stringify({ example: "payload" }),
  } satisfies INotificationWorkflowTriggerInstance.ICreate;
  const triggerInstance: INotificationWorkflowTriggerInstance =
    await api.functional.notificationWorkflow.systemAdmin.triggerInstances.create(
      connection,
      {
        body: triggerInstanceCreateBody,
      },
    );
  typia.assert(triggerInstance);

  // 5. Delete the TriggerInstance
  await api.functional.notificationWorkflow.systemAdmin.triggerInstances.erase(
    connection,
    {
      triggerInstanceId: triggerInstance.id,
    },
  );
}
