import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";

/**
 * Test the deletion of a trigger instance by a trigger operator.
 *
 * This test covers the entire workflow of:
 *
 * 1. Registering a trigger operator user with valid credentials.
 * 2. Creating a trigger instance using the authenticated operator.
 * 3. Successfully deleting the created trigger instance.
 * 4. Validating that unauthenticated deletion attempts are rejected.
 * 5. Ensuring deletion of an already deleted trigger instance fails.
 *
 * The test asserts that all API operations complete with correct type
 * validation, and business logic regarding authorization and data lifecycle
 * is enforced.
 */
export async function test_api_trigger_instance_delete_by_trigger_operator(
  connection: api.IConnection,
) {
  // Step 1. Trigger operator user registration
  const operatorBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;

  const operator: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      {
        body: operatorBody,
      },
    );
  typia.assert(operator);

  // Step 2. Create trigger instance as authenticated trigger operator
  const triggerInstanceBody = {
    workflow_id: typia.random<string & tags.Format<"uuid">>(),
    idempotency_key: RandomGenerator.alphaNumeric(16),
    payload: JSON.stringify({ message: RandomGenerator.paragraph() }),
  } satisfies INotificationWorkflowTriggerInstance.ICreate;

  const triggerInstance: INotificationWorkflowTriggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.create(
      connection,
      {
        body: triggerInstanceBody,
      },
    );
  typia.assert(triggerInstance);

  // Step 3. Delete the created trigger instance
  await api.functional.notificationWorkflow.triggerOperator.triggerInstances.erase(
    connection,
    {
      triggerInstanceId: triggerInstance.id,
    },
  );

  // Step 4. Attempt unauthorized deletion (unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated deletion should fail",
    async () => {
      await api.functional.notificationWorkflow.triggerOperator.triggerInstances.erase(
        unauthenticatedConnection,
        {
          triggerInstanceId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 5. Attempt deleting already deleted trigger instance (should fail)
  await TestValidator.error(
    "deleting already deleted trigger instance should fail",
    async () => {
      await api.functional.notificationWorkflow.triggerOperator.triggerInstances.erase(
        connection,
        {
          triggerInstanceId: triggerInstance.id,
        },
      );
    },
  );
}
