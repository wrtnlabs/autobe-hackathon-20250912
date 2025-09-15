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
 * Test the creation and idempotency enforcement of TriggerInstance
 * creation.
 *
 * This test ensures that a trigger operator can create a trigger instance
 * for a workflow, and that multiple attempts with the same idempotency key
 * result in the same trigger instance being returned without duplication.
 *
 * The test involves multiple roles: a trigger operator and a system admin.
 *
 * Flow:
 *
 * 1. Trigger operator registers and authenticates.
 * 2. System admin registers and authenticates.
 * 3. System admin creates a notification workflow.
 * 4. Trigger operator creates a trigger instance with unique idempotency key
 *    and payload.
 * 5. Trigger operator attempts to create the same trigger instance again with
 *    same idempotency key and workflow id.
 * 6. Verify the same instance is returned.
 */
export async function test_api_trigger_trigger_instance_create_idempotency_success(
  connection: api.IConnection,
) {
  // Step 1: Trigger operator registers
  const triggerOperatorEmail = typia.random<string & tags.Format<"email">>();
  const triggerOperatorPasswordHash = RandomGenerator.alphaNumeric(32);
  const triggerOperator: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      {
        body: {
          email: triggerOperatorEmail,
          password_hash: triggerOperatorPasswordHash,
        } satisfies INotificationWorkflowTriggerOperator.ICreate,
      },
    );
  typia.assert(triggerOperator);

  // Step 2: System admin registers
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = RandomGenerator.alphaNumeric(16);
  const systemAdmin: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: systemAdminEmail,
        password: systemAdminPassword,
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(systemAdmin);

  // Step 3: System admin login
  const systemAdminAuth: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: systemAdminEmail,
        password: systemAdminPassword,
      } satisfies INotificationWorkflowSystemAdmin.IRequestLogin,
    });
  typia.assert(systemAdminAuth);

  // Step 4: System admin creates a notification workflow
  const workflowCode = RandomGenerator.alphaNumeric(8);
  const workflowName = RandomGenerator.name(3);
  const entryNodeId = typia.random<string & tags.Format<"uuid">>();
  const workflowCreateBody = {
    code: workflowCode,
    name: workflowName,
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

  // Step 5: Trigger operator login
  const triggerOperatorAuth: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.login.loginTriggerOperator(
      connection,
      {
        body: {
          email: triggerOperatorEmail,
          password_hash: triggerOperatorPasswordHash,
        } satisfies INotificationWorkflowTriggerOperator.ILogin,
      },
    );
  typia.assert(triggerOperatorAuth);

  // Step 6: Create a trigger instance with a unique idempotency key and payload
  const idempotencyKey = typia.random<string>();
  const payloadObj = { sampleData: RandomGenerator.alphaNumeric(10) };
  const payloadJson = JSON.stringify(payloadObj);

  const triggerInstanceCreateBody = {
    workflow_id: workflow.id,
    idempotency_key: idempotencyKey,
    payload: payloadJson,
  } satisfies INotificationWorkflowTriggerInstance.ICreate;

  const triggerInstance1: INotificationWorkflowTriggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.create(
      connection,
      {
        body: triggerInstanceCreateBody,
      },
    );
  typia.assert(triggerInstance1);

  // Step 7: Attempt to create the same trigger instance again with same idempotency key and workflow id
  const triggerInstance2: INotificationWorkflowTriggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.create(
      connection,
      {
        body: triggerInstanceCreateBody,
      },
    );
  typia.assert(triggerInstance2);

  // Validation: Ensure both trigger instances have the same id to confirm idempotency
  TestValidator.equals(
    "trigger instance idempotency enforcement: ids must match",
    triggerInstance1.id,
    triggerInstance2.id,
  );

  // Validation: Check workflow id matches
  TestValidator.equals(
    "trigger instance workflow id matches created workflow",
    triggerInstance1.workflow_id,
    workflow.id,
  );

  // Validation: Idempotency key matches
  TestValidator.equals(
    "trigger instance idempotency key matches",
    triggerInstance1.idempotency_key,
    idempotencyKey,
  );

  // Validation: Payload string matches
  TestValidator.equals(
    "trigger instance payload matches",
    triggerInstance1.payload,
    payloadJson,
  );
}
