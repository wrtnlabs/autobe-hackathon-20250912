import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";

/**
 * E2E test for creating a TriggerInstance with idempotency enforcement.
 *
 * This test covers the entire workflow under the systemAdmin authorization
 * context:
 *
 * 1. Join as a new systemAdmin user to establish authorization token.
 * 2. Create a new Notification Workflow to obtain a valid workflowId.
 * 3. Create a TriggerInstance with a unique idempotencyKey and a random
 *    payload.
 * 4. Repeat creation with the same workflowId and idempotencyKey to confirm
 *    idempotency.
 * 5. Validate all API responses with typia.assert and confirm that the same
 *    TriggerInstance is returned for the duplicate trigger.
 */
export async function test_api_system_admin_trigger_instances_create_idempotency_success(
  connection: api.IConnection,
) {
  // 1. Join systemAdmin
  const systemAdminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "TestPassword123!",
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminJoinBody,
    });
  typia.assert(systemAdmin);

  // 2. Create notification workflow
  const workflowCreateBody = {
    code: `code-${RandomGenerator.alphaNumeric(8)}`,
    name: `Workflow ${RandomGenerator.alphaNumeric(6)}`,
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

  // 3. Create a TriggerInstance
  const uniqueIdempotencyKey = `idem-key-${RandomGenerator.alphaNumeric(10)}`;
  const triggerPayload = JSON.stringify({
    sample: RandomGenerator.alphaNumeric(16),
  });

  const triggerInstanceCreateBody = {
    workflow_id: workflow.id,
    idempotency_key: uniqueIdempotencyKey,
    payload: triggerPayload,
  } satisfies INotificationWorkflowTriggerInstance.ICreate;

  const triggerInstance1: INotificationWorkflowTriggerInstance =
    await api.functional.notificationWorkflow.systemAdmin.triggerInstances.create(
      connection,
      {
        body: triggerInstanceCreateBody,
      },
    );
  typia.assert(triggerInstance1);

  // 4. Repeat creation with same workflowId and idempotencyKey to test idempotency
  const triggerInstance2: INotificationWorkflowTriggerInstance =
    await api.functional.notificationWorkflow.systemAdmin.triggerInstances.create(
      connection,
      {
        body: triggerInstanceCreateBody,
      },
    );
  typia.assert(triggerInstance2);

  // 5. Validate that the same TriggerInstance is returned
  TestValidator.equals(
    "idempotent TriggerInstance id",
    triggerInstance1.id,
    triggerInstance2.id,
  );
  TestValidator.equals(
    "idempotent TriggerInstance workflow id",
    triggerInstance1.workflow_id,
    triggerInstance2.workflow_id,
  );
  TestValidator.equals(
    "idempotent TriggerInstance idempotency key",
    triggerInstance1.idempotency_key,
    triggerInstance2.idempotency_key,
  );
  TestValidator.equals(
    "idempotent TriggerInstance status",
    triggerInstance1.status,
    triggerInstance2.status,
  );
  TestValidator.equals(
    "idempotent TriggerInstance payload",
    triggerInstance1.payload,
    triggerInstance2.payload,
  );
  TestValidator.equals(
    "idempotent TriggerInstance attempts",
    triggerInstance1.attempts,
    triggerInstance2.attempts,
  );
  TestValidator.equals(
    "idempotent TriggerInstance availability",
    triggerInstance1.available_at,
    triggerInstance2.available_at,
  );
  TestValidator.equals(
    "idempotent TriggerInstance cursor",
    triggerInstance1.cursor_current_node_id,
    triggerInstance2.cursor_current_node_id,
  );
  TestValidator.equals(
    "idempotent TriggerInstance created_at",
    triggerInstance1.created_at,
    triggerInstance2.created_at,
  );
  TestValidator.equals(
    "idempotent TriggerInstance updated_at",
    triggerInstance1.updated_at,
    triggerInstance2.updated_at,
  );
}
