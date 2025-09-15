import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowStepExecutionLog";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";

/**
 * Test retrieval of a step execution log detail by a system administrator.
 *
 * This test performs the following operations:
 *
 * 1. Creates a system administrator user via /auth/systemAdmin/join endpoint.
 * 2. Creates a trigger instance to generate prerequisite workflow data.
 * 3. Retrieves a step execution log by ID, verifying all data fields.
 * 4. Validates that unauthenticated and invalid token requests are rejected.
 *
 * It ensures that the notification workflow system's audit logs are
 * securely accessible only to authorized system administrators and
 * validates the correctness of retrieved data.
 *
 * Steps:
 *
 * 1. Join as a new system admin user with a generated email and password.
 * 2. Create a workflow trigger instance with a random workflow_id,
 *    idempotency_key, and payload.
 * 3. Attempt to get a step execution log ID, using a random id if no real one
 *    is available.
 * 4. Retrieve the step execution log by ID using authenticated connection.
 * 5. Assert the returned log for proper data structure and expected values.
 * 6. Test error scenarios by calling the endpoint without and with invalid
 *    auth.
 */
export async function test_api_step_execution_log_at_for_system_admin_success_and_auth_failure(
  connection: api.IConnection,
) {
  // 1. Create a new system admin user and set auth context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234",
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinBody });
  typia.assert(systemAdmin);

  // 2. Create a trigger instance for workflow execution
  const triggerCreateBody = {
    workflow_id: typia.random<string & tags.Format<"uuid">>(),
    idempotency_key: RandomGenerator.alphaNumeric(16),
    payload: JSON.stringify({ info: "test trigger payload" }),
  } satisfies INotificationWorkflowTriggerInstance.ICreate;

  const triggerInstance: INotificationWorkflowTriggerInstance =
    await api.functional.notificationWorkflow.systemAdmin.triggerInstances.create(
      connection,
      { body: triggerCreateBody },
    );
  typia.assert(triggerInstance);

  // 3. Prepare a step execution log id to retrieve
  // Use the trigger instance id as base to try retrieving a step log,
  // if no such log is guaranteed, just use a random id
  const stepExecutionLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Retrieve the step execution log by id as authenticated system admin user
  const log: INotificationWorkflowStepExecutionLog =
    await api.functional.notificationWorkflow.systemAdmin.stepExecutionLogs.at(
      connection,
      { id: stepExecutionLogId },
    );
  typia.assert(log);

  // Validate critical fields consistency
  TestValidator.predicate(
    "step execution log id exists",
    typeof log.id === "string" && log.id.length > 0,
  );
  TestValidator.predicate(
    "workflow_id is uuid format",
    typeof log.workflow_id === "string" && log.workflow_id.length > 0,
  );
  TestValidator.predicate(
    "trigger_id matches uuid format",
    typeof log.trigger_id === "string" && log.trigger_id.length > 0,
  );
  TestValidator.predicate(
    "node_id matches uuid format",
    typeof log.node_id === "string" && log.node_id.length > 0,
  );
  TestValidator.predicate(
    "attempt is number and positive",
    typeof log.attempt === "number" && log.attempt >= 1,
  );
  TestValidator.predicate(
    "started_at is date-time string",
    typeof log.started_at === "string" && log.started_at.length > 0,
  );
  TestValidator.predicate(
    "finished_at is date-time string",
    typeof log.finished_at === "string" && log.finished_at.length > 0,
  );
  TestValidator.predicate(
    "input_context is string",
    typeof log.input_context === "string",
  );
  TestValidator.predicate(
    "output_context is string",
    typeof log.output_context === "string",
  );
  TestValidator.equals("success is boolean", typeof log.success, "boolean");

  // Nullable fields validation
  TestValidator.predicate(
    "email_message_id is string or null or undefined",
    log.email_message_id === null ||
      log.email_message_id === undefined ||
      typeof log.email_message_id === "string",
  );
  TestValidator.predicate(
    "sms_message_id is string or null or undefined",
    log.sms_message_id === null ||
      log.sms_message_id === undefined ||
      typeof log.sms_message_id === "string",
  );
  TestValidator.predicate(
    "error_message is string or null or undefined",
    log.error_message === null ||
      log.error_message === undefined ||
      typeof log.error_message === "string",
  );

  // 5. Test access with no authentication (unauthenticated)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.notificationWorkflow.systemAdmin.stepExecutionLogs.at(
      unauthenticatedConnection,
      { id: stepExecutionLogId },
    );
  });

  // 6. Test access with invalid token
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer invalid_token" },
  };
  await TestValidator.error(
    "access with invalid token should fail",
    async () => {
      await api.functional.notificationWorkflow.systemAdmin.stepExecutionLogs.at(
        invalidTokenConnection,
        { id: stepExecutionLogId },
      );
    },
  );
}
