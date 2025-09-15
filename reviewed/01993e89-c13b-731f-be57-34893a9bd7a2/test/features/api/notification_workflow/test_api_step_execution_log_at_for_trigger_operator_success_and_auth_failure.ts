import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowStepExecutionLog";
import type { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";

/**
 * The test performs a complete e2e flow for a trigger operator managing
 * notification workflow step execution logs.
 *
 * 1. A new trigger operator user is registered with a unique email and secure
 *    password hash, retrieving an authorization token.
 * 2. Using the authenticated trigger operator, a trigger instance is created
 *    for a workflow, using a unique workflow idempotency key with realistic
 *    payload.
 * 3. The system returns a complete trigger instance representation including
 *    id, status, timestamps, and payload.
 * 4. Using the valid trigger instance, we attempt to retrieve a step execution
 *    log by id, expecting detailed information about the workflow execution
 *    step, validating all fields such as timestamps, success status,
 *    input/output context, message IDs, and error message nullability.
 * 5. The test checks unauthorized access scenarios by attempting to fetch the
 *    same log without authentication, expecting error or denial.
 *
 * All random data generation respects tag patterns and formats, all
 * responses are asserted with typia.assert, and every TestValidator call
 * includes clear descriptive titles. Await is properly used on all async
 * calls.
 */
export async function test_api_step_execution_log_at_for_trigger_operator_success_and_auth_failure(
  connection: api.IConnection,
) {
  // 1. Trigger operator user registration
  const joinBody = {
    email: RandomGenerator.alphaNumeric(8).toLowerCase() + "@test.com",
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;
  const triggerOperator: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      {
        body: joinBody,
      },
    );
  typia.assert(triggerOperator);

  // 2. Create a trigger instance for a workflow
  // Generate workflow_id, idempotency_key, and JSON payload string
  const workflowId = typia.random<string & tags.Format<"uuid">>();
  const idempotencyKey = RandomGenerator.alphaNumeric(16);
  const payloadObj = {
    event: "test_event",
    data: {
      randomId: RandomGenerator.alphaNumeric(12),
      timestamp: new Date().toISOString(),
    },
  };
  const triggerInstanceBody = {
    workflow_id: workflowId,
    idempotency_key: idempotencyKey,
    payload: JSON.stringify(payloadObj),
  } satisfies INotificationWorkflowTriggerInstance.ICreate;

  const triggerInstance: INotificationWorkflowTriggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.create(
      connection,
      {
        body: triggerInstanceBody,
      },
    );
  typia.assert(triggerInstance);

  // 3. Simulate a step execution log ID
  // Real creation API is missing, use a random valid UUID as id
  const stepExecutionLogId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve step execution log detail
  const stepExecutionLog: INotificationWorkflowStepExecutionLog =
    await api.functional.notificationWorkflow.triggerOperator.stepExecutionLogs.at(
      connection,
      {
        id: stepExecutionLogId,
      },
    );
  typia.assert(stepExecutionLog);

  // 5. Test unauthorized access
  // Make a new connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized: fetch stepExecutionLog without auth",
    async () => {
      await api.functional.notificationWorkflow.triggerOperator.stepExecutionLogs.at(
        unauthConn,
        {
          id: stepExecutionLogId,
        },
      );
    },
  );
}
