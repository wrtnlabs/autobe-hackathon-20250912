import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";

/**
 * Tests the complete trigger instance creation workflow for a trigger
 * operator.
 *
 * The test covers:
 *
 * 1. Trigger operator user signup and authentication
 * 2. System administrator signup and authentication
 * 3. System administrator creates a notification workflow
 * 4. Trigger operator creates a trigger instance with idempotency
 * 5. Verifies idempotency key enforcement by re-creating with the same key
 * 6. Validates status, cursor, attempts, and timestamps according to schema
 *
 * This E2E test ensures proper operation of user roles, workflow creation,
 * and trigger instance lifecycle management with idempotency protection.
 */
export async function test_api_trigger_instance_creation_idempotency_trigger_operator(
  connection: api.IConnection,
) {
  // 1. Trigger operator signup
  const triggerOperatorCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@test.com",
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;
  const triggerOperator: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      { body: triggerOperatorCreateBody },
    );
  typia.assert(triggerOperator);

  // 2. Trigger operator login
  const triggerOperatorLoginBody = {
    email: triggerOperator.email,
    password_hash: triggerOperatorCreateBody.password_hash,
  } satisfies INotificationWorkflowTriggerOperator.ILogin;
  const triggerOperatorLoggedIn: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.login.loginTriggerOperator(
      connection,
      { body: triggerOperatorLoginBody },
    );
  typia.assert(triggerOperatorLoggedIn);

  // 3. System admin signup
  const systemAdminCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@admin.com",
    password: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;
  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 4. System admin login
  const systemAdminLoginBody = {
    email: systemAdmin.email,
    password: systemAdminCreateBody.password,
  } satisfies INotificationWorkflowSystemAdmin.IRequestLogin;
  const systemAdminLoggedIn: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(systemAdminLoggedIn);

  // 5. System admin creates a notification workflow
  // Generate UUID for entry_node_id
  const entryNodeId = typia.random<string & tags.Format<"uuid">>();
  const workflowCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    is_active: true,
    entry_node_id: entryNodeId,
    version: 1 as number & tags.Type<"int32">,
  } satisfies INotificationWorkflowWorkflow.ICreate;
  const workflow: INotificationWorkflowWorkflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      { body: workflowCreateBody },
    );
  typia.assert(workflow);
  TestValidator.equals(
    "workflow entry_node_id",
    workflow.entry_node_id,
    entryNodeId,
  );

  // 6. Switch back to trigger operator login for trigger instance creation
  await api.functional.auth.triggerOperator.login.loginTriggerOperator(
    connection,
    {
      body: triggerOperatorLoginBody,
    },
  );

  // 7. Trigger operator creates a trigger instance with idempotency key
  const idempotencyKey = RandomGenerator.alphaNumeric(20);
  const payloadForTrigger = JSON.stringify({
    test: "data",
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  const triggerInstanceCreateBody = {
    workflow_id: workflow.id,
    idempotency_key: idempotencyKey,
    payload: payloadForTrigger,
  } satisfies INotificationWorkflowTriggerInstance.ICreate;

  const firstTriggerInstance: INotificationWorkflowTriggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.create(
      connection,
      { body: triggerInstanceCreateBody },
    );
  typia.assert(firstTriggerInstance);

  // Validation of first trigger instance
  TestValidator.equals(
    "trigger instance workflow_id",
    firstTriggerInstance.workflow_id,
    workflow.id,
  );
  TestValidator.equals(
    "trigger instance idempotency_key",
    firstTriggerInstance.idempotency_key,
    idempotencyKey,
  );
  TestValidator.predicate(
    "trigger instance status is valid",
    ["enqueued", "processing", "completed", "failed"].includes(
      firstTriggerInstance.status,
    ),
  );
  TestValidator.equals(
    "trigger instance attempts",
    firstTriggerInstance.attempts,
    0,
  );
  TestValidator.equals(
    "trigger instance cursor_current_node_id",
    firstTriggerInstance.cursor_current_node_id ?? null,
    workflow.entry_node_id,
  );
  TestValidator.predicate(
    "trigger instance created_at is ISO string",
    typeof firstTriggerInstance.created_at === "string" &&
      firstTriggerInstance.created_at.length > 0,
  );
  TestValidator.predicate(
    "trigger instance payload matches provided payload",
    firstTriggerInstance.payload === payloadForTrigger,
  );

  // 8. Attempt to create a trigger instance with the same idempotency key - should return the same instance
  const secondTriggerInstance: INotificationWorkflowTriggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.create(
      connection,
      { body: triggerInstanceCreateBody },
    );
  typia.assert(secondTriggerInstance);

  // Validate that second response matches first
  TestValidator.equals(
    "idempotency enforced: same id",
    secondTriggerInstance.id,
    firstTriggerInstance.id,
  );
  TestValidator.equals(
    "idempotency enforced: workflow_id",
    secondTriggerInstance.workflow_id,
    firstTriggerInstance.workflow_id,
  );
  TestValidator.equals(
    "idempotency enforced: idempotency_key",
    secondTriggerInstance.idempotency_key,
    firstTriggerInstance.idempotency_key,
  );
  TestValidator.equals(
    "idempotency enforced: status",
    secondTriggerInstance.status,
    firstTriggerInstance.status,
  );
  TestValidator.equals(
    "idempotency enforced: attempts",
    secondTriggerInstance.attempts,
    firstTriggerInstance.attempts,
  );
  TestValidator.equals(
    "idempotency enforced: cursor_current_node_id",
    secondTriggerInstance.cursor_current_node_id ?? null,
    firstTriggerInstance.cursor_current_node_id ?? null,
  );
  TestValidator.equals(
    "idempotency enforced: created_at",
    secondTriggerInstance.created_at,
    firstTriggerInstance.created_at,
  );
  TestValidator.equals(
    "idempotency enforced: payload",
    secondTriggerInstance.payload,
    firstTriggerInstance.payload,
  );
}
