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
 * This E2E test validates the creation of a notification workflow trigger
 * instance by simulating multi-role user interactions.
 *
 * The test flow is:
 *
 * 1. Create a trigger operator user (triggerOperator role) and authenticate.
 * 2. Create a workflow manager user (workflowManager role) and authenticate.
 * 3. Using the workflowManager user, create a notification workflow with a valid
 *    entry node.
 * 4. Using the triggerOperator user, create a trigger instance with a unique
 *    idempotency key.
 * 5. Attempt duplicate creation with the same idempotency key to verify
 *    idempotency behavior.
 *
 * All API responses are validated with typia.assert, with appropriate
 * TestValidator assertions on expected idempotent behavior.
 */
export async function test_api_trigger_instance_creation_as_trigger_operator_with_idempotency(
  connection: api.IConnection,
) {
  // 1. Trigger operator user creation
  const triggerOperatorCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;

  const triggerOperator: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      {
        body: triggerOperatorCreateBody,
      },
    );
  typia.assert(triggerOperator);

  // 2. Workflow manager user creation
  const workflowManagerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  const workflowManager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: workflowManagerCreateBody,
    });
  typia.assert(workflowManager);

  // 3. Login as workflowManager to authenticate and create workflow
  const workflowManagerLoginBody = {
    email: workflowManagerCreateBody.email,
    password: workflowManagerCreateBody.password_hash,
  } satisfies INotificationWorkflowWorkflowManager.ILogin;

  const loggedInWorkflowManager: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.login(connection, {
      body: workflowManagerLoginBody,
    });
  typia.assert(loggedInWorkflowManager);

  // 4. Create notification workflow with valid entry_node_id
  // Generate UUID for entry_node_id
  const entryNodeId = typia.random<string & tags.Format<"uuid">>();

  // Construct workflow creation body
  const workflowCreateBody = {
    code: `code-${RandomGenerator.alphaNumeric(8)}`,
    name: `Workflow ${RandomGenerator.alphaNumeric(6)}`,
    is_active: true,
    entry_node_id: entryNodeId,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      {
        body: workflowCreateBody,
      },
    );
  typia.assert(workflow);

  TestValidator.equals(
    "workflow entry_node_id matches",
    workflow.entry_node_id,
    entryNodeId,
  );

  // 5. Login as triggerOperator
  const triggerOperatorLoginBody = {
    email: triggerOperatorCreateBody.email,
    password_hash: triggerOperatorCreateBody.password_hash,
  } satisfies INotificationWorkflowTriggerOperator.ILogin;

  const loggedInTriggerOperator: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.login.loginTriggerOperator(
      connection,
      {
        body: triggerOperatorLoginBody,
      },
    );
  typia.assert(loggedInTriggerOperator);

  // 6. Create a trigger instance with unique idempotency key
  const idempotencyKey = `idempotency-${RandomGenerator.alphaNumeric(16)}`;
  const payload = JSON.stringify({
    test: "payload",
    timestamp: new Date().toISOString(),
  });

  const triggerInstanceCreateBody = {
    workflow_id: workflow.id,
    idempotency_key: idempotencyKey,
    payload: payload,
  } satisfies INotificationWorkflowTriggerInstance.ICreate;

  const triggerInstance: INotificationWorkflowTriggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.create(
      connection,
      {
        body: triggerInstanceCreateBody,
      },
    );
  typia.assert(triggerInstance);

  TestValidator.equals(
    "triggerInstance workflow_id matches",
    triggerInstance.workflow_id,
    workflow.id,
  );
  TestValidator.equals(
    "triggerInstance idempotency_key matches",
    triggerInstance.idempotency_key,
    idempotencyKey,
  );
  TestValidator.equals(
    "triggerInstance payload matches",
    triggerInstance.payload,
    payload,
  );

  // 7. Attempt duplicate creation with same idempotency key - should return same instance
  const triggerInstanceDuplicate: INotificationWorkflowTriggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.create(
      connection,
      {
        body: triggerInstanceCreateBody,
      },
    );
  typia.assert(triggerInstanceDuplicate);

  TestValidator.equals(
    "idempotent creation returns same id",
    triggerInstanceDuplicate.id,
    triggerInstance.id,
  );

  TestValidator.equals(
    "duplicate payload matches",
    triggerInstanceDuplicate.payload,
    payload,
  );
}
