import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowStepExecutionLog";
import type { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import type { INotificationWorkflowWorkflowNode } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowNode";

/**
 * Comprehensive validation for Notification Workflow Step Execution Log
 * retrieval.
 *
 * This test executes an end-to-end workflow scenario validating that a step
 * execution log can be successfully created and retrieved by a
 * workflowManager authorized user.
 *
 * Workflow:
 *
 * 1. Create and authenticate a 'workflowManager' user.
 * 2. Create a notification workflow with an entry node ID.
 * 3. Create workflow nodes representing notification steps.
 * 4. Create edges linking nodes, forming a Directed Acyclic Graph.
 * 5. Create and authenticate a 'triggerOperator' user.
 * 6. Create a trigger instance for the defined workflow.
 * 7. Simulate creation of a step execution log targeting the workflow node and
 *    trigger instance.
 * 8. Retrieve the step execution log by ID using workflowManager
 *    authorization.
 * 9. Verify the retrieved log matches the created log with all expected
 *    properties.
 *
 * The test ensures correctness of API responses, proper token handling
 * between roles, and respects all data format and constraint requirements.
 */
export async function test_api_step_execution_log_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate workflowManager user
  const workflowManagerCreate = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;
  const workflowManager = await api.functional.auth.workflowManager.join(
    connection,
    { body: workflowManagerCreate },
  );
  typia.assert(workflowManager);

  // 2. Create a notification workflow with a placeholder entry_node_id
  // Placeholder entry_node_id temporarily to be replaced later
  const dummyUUID = typia.random<string & tags.Format<"uuid">>();
  const workflowCreate = {
    code: "WF_CODE_" + RandomGenerator.alphaNumeric(6),
    name: "Test Workflow",
    is_active: true,
    entry_node_id: dummyUUID,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;
  const workflow =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      { body: workflowCreate },
    );
  typia.assert(workflow);

  // 3. Create first workflow node which will be the entry node
  const workflowNodeCreate = {
    workflow_id: workflow.id,
    node_type: "email",
    name: "Entry Email Node",
    email_to_template: "{{ payload.email }}",
    email_subject_template: "Test Subject",
    email_body_template: "This is a test email body.",
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const workflowNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      { workflowId: workflow.id, body: workflowNodeCreate },
    );
  typia.assert(workflowNode);

  // 4. Adjust workflow's entry_node_id to the actual created node ID
  // This is a limitation since the API requires entry_node_id on creation
  // but we needed a valid node ID
  // There is no update API in the materials, so we simulate by recreating workflow
  // For test consistency, logout and rejoin workflowManager to reset context

  // Login again (simulate user session restart and to get fresh token)
  const workflowManagerLogin = {
    email: workflowManagerCreate.email,
    password: workflowManagerCreate.password_hash,
  } satisfies INotificationWorkflowWorkflowManager.ILogin;

  await api.functional.auth.workflowManager.login(connection, {
    body: workflowManagerLogin,
  });

  // Create new workflow with actual entry_node_id
  const workflowCreateFinal = {
    ...workflowCreate,
    entry_node_id: workflowNode.id,
  } satisfies INotificationWorkflowWorkflow.ICreate;
  const workflowFinal =
    await api.functional.notificationWorkflow.workflowManager.workflows.create(
      connection,
      { body: workflowCreateFinal },
    );
  typia.assert(workflowFinal);

  // 5. Create a second workflow node for linking
  const secondNodeCreate = {
    workflow_id: workflowFinal.id,
    node_type: "sms",
    name: "Second SMS Node",
    sms_to_template: "{{ payload.phone }}",
    sms_body_template: "Test SMS content",
  } satisfies INotificationWorkflowWorkflowNode.ICreate;
  const secondNode =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowNodes.create(
      connection,
      { workflowId: workflowFinal.id, body: secondNodeCreate },
    );
  typia.assert(secondNode);

  // 6. Create workflow edge linking entry node to second node
  const workflowEdgeCreate = {
    workflow_id: workflowFinal.id,
    from_node_id: workflowNode.id,
    to_node_id: secondNode.id,
  } satisfies INotificationWorkflowWorkflowEdge.ICreate;
  const workflowEdge =
    await api.functional.notificationWorkflow.workflowManager.workflows.workflowEdges.createEdge(
      connection,
      { workflowId: workflowFinal.id, body: workflowEdgeCreate },
    );
  typia.assert(workflowEdge);

  // 7. Create and authenticate triggerOperator user
  const triggerOperatorCreate = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;
  const triggerOperator =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      { body: triggerOperatorCreate },
    );
  typia.assert(triggerOperator);

  // Login as triggerOperator
  const triggerOperatorLogin = {
    email: triggerOperatorCreate.email,
    password_hash: triggerOperatorCreate.password_hash,
  } satisfies INotificationWorkflowTriggerOperator.ILogin;
  await api.functional.auth.triggerOperator.login.loginTriggerOperator(
    connection,
    { body: triggerOperatorLogin },
  );

  // 8. Create trigger instance for the workflow
  const triggerInstanceCreate = {
    workflow_id: workflowFinal.id,
    idempotency_key: "idempotency_key_" + RandomGenerator.alphaNumeric(6),
    payload: JSON.stringify({
      email: "test@example.com",
      phone: "+1234567890",
    }),
  } satisfies INotificationWorkflowTriggerInstance.ICreate;
  const triggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.create(
      connection,
      { body: triggerInstanceCreate },
    );
  typia.assert(triggerInstance);

  // 9. Switch back to workflowManager user
  await api.functional.auth.workflowManager.login(connection, {
    body: workflowManagerLogin,
  });

  // 10. Create simulated step execution log data
  // Since there is no create API for stepExecutionLogs, we simulate one
  // by using typia.random and still setting mandatory link properties
  const simulatedStepLog: INotificationWorkflowStepExecutionLog = {
    id: typia.random<string & tags.Format<"uuid">>(),
    workflow_id: workflowFinal.id,
    trigger_id: triggerInstance.id,
    node_id: workflowNode.id,
    attempt: 1 as number & tags.Type<"int32">,
    started_at: new Date().toISOString(),
    finished_at: new Date(Date.now() + 1000).toISOString(),
    input_context: JSON.stringify({ email: "user@example.com" }),
    output_context: JSON.stringify({ result: "success" }),
    success: true,
    email_message_id: typia.random<string & tags.Format<"uuid">>(),
    sms_message_id: null,
    error_message: null,
  };

  // 11. Retrieve the step execution log by ID
  const retrievedLog =
    await api.functional.notificationWorkflow.workflowManager.stepExecutionLogs.at(
      connection,
      { id: simulatedStepLog.id },
    );
  typia.assert(retrievedLog);

  // 12. Validate retrieved log correctness
  TestValidator.equals(
    "step execution log id matches",
    retrievedLog.id,
    simulatedStepLog.id,
  );
  TestValidator.equals(
    "workflow_id matches",
    retrievedLog.workflow_id,
    simulatedStepLog.workflow_id,
  );
  TestValidator.equals(
    "trigger_id matches",
    retrievedLog.trigger_id,
    simulatedStepLog.trigger_id,
  );
  TestValidator.equals(
    "node_id matches",
    retrievedLog.node_id,
    simulatedStepLog.node_id,
  );
  TestValidator.equals(
    "attempt number matches",
    retrievedLog.attempt,
    simulatedStepLog.attempt,
  );
  TestValidator.equals(
    "success flag matches",
    retrievedLog.success,
    simulatedStepLog.success,
  );
  TestValidator.equals(
    "email_message_id matches",
    retrievedLog.email_message_id,
    simulatedStepLog.email_message_id,
  );
  TestValidator.equals(
    "sms_message_id is null",
    retrievedLog.sms_message_id,
    null,
  );
  TestValidator.equals(
    "error_message is null",
    retrievedLog.error_message,
    null,
  );

  // 13. Validate timestamps and contexts with existence and JSON parse sanity
  TestValidator.predicate(
    "started_at is valid ISO date",
    (() => {
      const date = new Date(retrievedLog.started_at);
      return !isNaN(date.getTime());
    })(),
  );
  TestValidator.predicate(
    "finished_at is valid ISO date",
    (() => {
      const date = new Date(retrievedLog.finished_at);
      return !isNaN(date.getTime());
    })(),
  );
  TestValidator.predicate(
    "input_context is valid JSON",
    (() => {
      try {
        JSON.parse(retrievedLog.input_context);
        return true;
      } catch {
        return false;
      }
    })(),
  );
  TestValidator.predicate(
    "output_context is valid JSON",
    (() => {
      try {
        JSON.parse(retrievedLog.output_context);
        return true;
      } catch {
        return false;
      }
    })(),
  );
}
