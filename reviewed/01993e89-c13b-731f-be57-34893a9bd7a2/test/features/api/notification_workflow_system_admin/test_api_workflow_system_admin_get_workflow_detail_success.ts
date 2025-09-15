import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";

/**
 * Test successful retrieval of detailed workflow information by a systemAdmin
 * user.
 *
 * This test verifies the workflow management features for system administrators
 * in the notification workflow system.
 *
 * It carries out the following steps:
 *
 * 1. Creates and authenticates a new systemAdmin user.
 * 2. Creates a new notification workflow entity with realistic data.
 * 3. Retrieves the detailed workflow information by workflow ID.
 * 4. Validates that the retrieved workflow matches the created data in all
 *    critical fields.
 *
 * This enforces end-to-end validation of user registration, authentication,
 * workflow creation, and data querying functionalities for the systemAdmin
 * domain.
 */
export async function test_api_workflow_system_admin_get_workflow_detail_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a systemAdmin user
  const systemAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "strongpassword123",
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminJoinBody,
    });
  typia.assert(systemAdmin);

  // 2. Create a new notification workflow
  const notificationWorkflowCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    is_active: true,
    entry_node_id: typia.random<string & tags.Format<"uuid">>(),
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const createdWorkflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      {
        body: notificationWorkflowCreateBody,
      },
    );
  typia.assert(createdWorkflow);

  TestValidator.equals(
    "created workflow code matches",
    createdWorkflow.code,
    notificationWorkflowCreateBody.code,
  );

  // 3. Retrieve the workflow detail by workflowId
  const queriedWorkflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.at(
      connection,
      {
        workflowId: createdWorkflow.id,
      },
    );
  typia.assert(queriedWorkflow);

  // 4. Validate that selected fields match
  TestValidator.equals(
    "queried workflow id matches created id",
    queriedWorkflow.id,
    createdWorkflow.id,
  );
  TestValidator.equals(
    "queried workflow name matches created name",
    queriedWorkflow.name,
    createdWorkflow.name,
  );
  TestValidator.equals(
    "queried workflow version matches created version",
    queriedWorkflow.version,
    createdWorkflow.version,
  );
  TestValidator.equals(
    "queried workflow is_active matches created is_active",
    queriedWorkflow.is_active,
    createdWorkflow.is_active,
  );
  TestValidator.equals(
    "queried workflow entry_node_id matches created entry_node_id",
    queriedWorkflow.entry_node_id,
    createdWorkflow.entry_node_id,
  );
}
