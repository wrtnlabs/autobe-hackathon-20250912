import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * Test successful retrieval of detailed notification workflow information.
 *
 * This test validates the end-to-end workflow wherein a workflowManager
 * user is created, then a notification workflow is registered by this user,
 * and finally, the details of that specific workflow are fetched to confirm
 * the accuracy and completeness of the response.
 *
 * Steps:
 *
 * 1. Create a new workflowManager user and authenticate.
 * 2. Create a new notification workflow with realistic and consistent data,
 *    ensuring the entry_node_id is a valid UUID.
 * 3. Fetch the created workflow details by workflowId.
 * 4. Validate the response matches the created entity and has all required
 *    properties.
 */
export async function test_api_workflow_workflow_manager_get_workflow_detail_success(
  connection: api.IConnection,
) {
  // Step 1: Create workflowManager user and authenticate
  const email = `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`;
  const password_hash = RandomGenerator.alphaNumeric(64); // Simulating hashed password

  const authorized: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email,
        password_hash,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  typia.assert(authorized);

  // Step 2: Create a notification workflow
  // Use a new UUID for entry_node_id
  const entryNodeId = typia.random<string & tags.Format<"uuid">>();

  const workflowName = RandomGenerator.name(2);
  const workflowCode = `${workflowName.replace(/\s/g, "_").toUpperCase()}_${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`;

  const createBody = {
    code: workflowCode,
    name: workflowName,
    is_active: true,
    entry_node_id: entryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const createdWorkflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdWorkflow);

  // Step 3: Fetch the created workflow details by its id
  const fetchedWorkflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.at(
      connection,
      { workflowId: createdWorkflow.id },
    );
  typia.assert(fetchedWorkflow);

  // Step 4: Validate properties of fetched workflow
  TestValidator.equals(
    "fetched workflow id matches created",
    fetchedWorkflow.id,
    createdWorkflow.id,
  );
  TestValidator.equals(
    "fetched workflow code matches created",
    fetchedWorkflow.code,
    createdWorkflow.code,
  );
  TestValidator.equals(
    "fetched workflow name matches created",
    fetchedWorkflow.name,
    createdWorkflow.name,
  );
  TestValidator.equals(
    "fetched workflow is_active matches created",
    fetchedWorkflow.is_active,
    createdWorkflow.is_active,
  );
  TestValidator.equals(
    "fetched workflow entry_node_id matches created",
    fetchedWorkflow.entry_node_id,
    createdWorkflow.entry_node_id,
  );
  TestValidator.equals(
    "fetched workflow version matches created",
    fetchedWorkflow.version,
    createdWorkflow.version,
  );
  TestValidator.predicate(
    "fetched workflow created_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(fetchedWorkflow.created_at),
  );
  TestValidator.predicate(
    "fetched workflow updated_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(fetchedWorkflow.updated_at),
  );
  // deleted_at can be null or undefined, validate accordingly
  TestValidator.predicate(
    "fetched workflow deleted_at is null or ISO date-time",
    fetchedWorkflow.deleted_at === null ||
      fetchedWorkflow.deleted_at === undefined ||
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(fetchedWorkflow.deleted_at),
  );
}
