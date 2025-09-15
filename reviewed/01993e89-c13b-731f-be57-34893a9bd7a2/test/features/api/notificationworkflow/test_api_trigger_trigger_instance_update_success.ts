import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";

export async function test_api_trigger_trigger_instance_update_success(
  connection: api.IConnection,
) {
  // 1. Trigger Operator user registration
  const triggerOperatorCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;
  const triggerOperator: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      {
        body: triggerOperatorCreateBody,
      },
    );
  typia.assert(triggerOperator);

  // 2. System Admin user registration
  const systemAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(20),
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;
  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 3. Create a notification workflow with entry_node_id
  // Generate a fake UUID for entry node id
  const entryNodeId = typia.random<string & tags.Format<"uuid">>();
  const workflowCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    is_active: true,
    entry_node_id: entryNodeId,
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

  // 4. Create a trigger instance for the workflow
  const idempotencyKey = RandomGenerator.alphaNumeric(12);
  const initialPayload = JSON.stringify({ test: "initial" });
  const triggerInstanceCreateBody = {
    workflow_id: workflow.id,
    idempotency_key: idempotencyKey,
    payload: initialPayload,
  } satisfies INotificationWorkflowTriggerInstance.ICreate;
  const triggerInstance: INotificationWorkflowTriggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.create(
      connection,
      {
        body: triggerInstanceCreateBody,
      },
    );
  typia.assert(triggerInstance);

  // 5. Update the trigger instance
  // Choose updated values for status, attempts, available_at, and payload
  const updatedStatus = "processing";
  // Ensure updatedStatus is one of the allowed statuses
  // Assuming from the description allowed enum values: enqueued, processing, completed, failed
  TestValidator.predicate(
    "status is a valid enum value",
    ["enqueued", "processing", "completed", "failed"].includes(updatedStatus),
  );
  const updatedAttempts = Math.max(triggerInstance.attempts + 1, 1);
  const updatedAvailableAt = new Date(Date.now() + 1000 * 60).toISOString(); // 1 min in future
  const updatedPayload = JSON.stringify({
    updated: true,
    timestamp: updatedAvailableAt,
  });

  const triggerInstanceUpdateBody = {
    status: updatedStatus,
    attempts: updatedAttempts,
    available_at: updatedAvailableAt,
    payload: updatedPayload,
  } satisfies INotificationWorkflowTriggerInstance.IUpdate;

  const updatedTriggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.update(
      connection,
      {
        triggerInstanceId: triggerInstance.id,
        body: triggerInstanceUpdateBody,
      },
    );
  typia.assert(updatedTriggerInstance);

  // 6. Validate that updatedTriggerInstance has the updated fields
  TestValidator.equals(
    "updated triggerInstance id matches",
    updatedTriggerInstance.id,
    triggerInstance.id,
  );
  TestValidator.equals(
    "updated workflow_id matches",
    updatedTriggerInstance.workflow_id,
    workflow.id,
  );
  TestValidator.equals(
    "updated status matches",
    updatedTriggerInstance.status,
    updatedStatus,
  );
  TestValidator.equals(
    "updated attempts matches",
    updatedTriggerInstance.attempts,
    updatedAttempts,
  );
  TestValidator.equals(
    "updated available_at matches",
    updatedTriggerInstance.available_at,
    updatedAvailableAt,
  );
  TestValidator.equals(
    "updated payload matches",
    updatedTriggerInstance.payload,
    updatedPayload,
  );
}
