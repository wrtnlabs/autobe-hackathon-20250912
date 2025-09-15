import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * This test validates retrieving a trigger instance detail by ID as a
 * trigger operator.
 *
 * It covers a realistic business workflow involving multiple roles:
 *
 * - Creating a trigger operator account
 * - Creating a workflow manager account
 * - Logging in with both roles to establish proper auth contexts
 * - Creating a notification workflow with required unique code and entry node
 * - Creating a trigger instance associated with the workflow
 * - Fetching the trigger instance by ID using trigger operator permissions
 *
 * Each step asserts type correctness using typia.assert and verifies
 * business logic using TestValidator to ensure data consistency and
 * authorization flows. This comprehensive scenario demonstrates multi-role
 * auth handling and entity lifecycle management in the notification
 * workflow domain.
 */
export async function test_api_trigger_instance_get_detail_as_trigger_operator(
  connection: api.IConnection,
) {
  // 1. Create a trigger operator user account
  const triggerOperatorCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;

  const triggerOperator: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      { body: triggerOperatorCreateBody },
    );
  typia.assert(triggerOperator);

  // 2. Create a workflow manager user
  const workflowManagerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  const workflowManager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: workflowManagerCreateBody,
    });
  typia.assert(workflowManager);

  // 3. Login as workflow manager to refresh authorization context
  const workflowManagerLoginBody = {
    email: workflowManagerCreateBody.email,
    password: workflowManagerCreateBody.password_hash,
  } satisfies INotificationWorkflowWorkflowManager.ILogin;

  const workflowManagerLoggedIn: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.login(connection, {
      body: workflowManagerLoginBody,
    });
  typia.assert(workflowManagerLoggedIn);

  // 4. Create a notification workflow
  const workflowCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(3),
    is_active: true,
    entry_node_id: typia.random<string & tags.Format<"uuid">>(),
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      { body: workflowCreateBody },
    );
  typia.assert(workflow);

  TestValidator.equals(
    "workflow code should match",
    workflow.code,
    workflowCreateBody.code,
  );
  TestValidator.equals(
    "workflow idempotency entry_node_id matches",
    workflow.entry_node_id,
    workflowCreateBody.entry_node_id,
  );

  // 5. Login as trigger operator to establish authentication context
  const triggerOperatorLoginBody = {
    email: triggerOperatorCreateBody.email,
    password_hash: triggerOperatorCreateBody.password_hash,
  } satisfies INotificationWorkflowTriggerOperator.ILogin;

  const triggerOperatorLoggedIn: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.login.loginTriggerOperator(
      connection,
      { body: triggerOperatorLoginBody },
    );
  typia.assert(triggerOperatorLoggedIn);

  // 6. Create trigger instance with unique idempotency_key and payload
  const triggerInstanceCreateBody = {
    workflow_id: workflow.id,
    idempotency_key: RandomGenerator.alphaNumeric(16),
    payload: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies INotificationWorkflowTriggerInstance.ICreate;

  const triggerInstance: INotificationWorkflowTriggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.create(
      connection,
      { body: triggerInstanceCreateBody },
    );
  typia.assert(triggerInstance);

  TestValidator.equals(
    "triggerInstance workflow_id matches created workflow",
    triggerInstance.workflow_id,
    workflow.id,
  );

  // 7. Get trigger instance by id as trigger operator
  const loadedTriggerInstance: INotificationWorkflowTriggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.at(
      connection,
      { triggerInstanceId: triggerInstance.id },
    );
  typia.assert(loadedTriggerInstance);

  TestValidator.equals(
    "loaded trigger instance equals created one",
    loadedTriggerInstance,
    triggerInstance,
  );
}
