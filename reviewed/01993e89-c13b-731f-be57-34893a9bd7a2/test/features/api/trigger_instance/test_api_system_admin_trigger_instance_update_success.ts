import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";

/**
 * E2E Test for updating a Notification Workflow TriggerInstance as a system
 * administrator.
 *
 * This test verifies that a system administrator can successfully create a
 * trigger instance, update its execution details such as cursor, status,
 * attempt count, availability, and payload, and that the updates are
 * reflected correctly in the response.
 *
 * The process involves:
 *
 * 1. Creating a system administrator user via the join API.
 * 2. Creating a notification workflow trigger instance with valid workflow_id
 *    and idempotency_key.
 * 3. Updating the trigger instance with new execution details.
 * 4. Validating that the updated fields in the response match the update
 *    request.
 */
export async function test_api_system_admin_trigger_instance_update_success(
  connection: api.IConnection,
) {
  // Step 1: Create a system administrator user
  const joinResponse: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "Abcd1234!",
      } satisfies INotificationWorkflowSystemAdmin.IRequestJoin,
    });
  typia.assert(joinResponse);

  // Step 2: Create a trigger instance
  const createBody: INotificationWorkflowTriggerInstance.ICreate = {
    workflow_id: typia.random<string & tags.Format<"uuid">>(),
    idempotency_key: `key_${RandomGenerator.alphaNumeric(16)}`,
    payload: JSON.stringify({ message: "payload_create" }),
  };

  const createdInstance =
    await api.functional.notificationWorkflow.systemAdmin.triggerInstances.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdInstance);

  // Step 3: Prepare update data
  const updateBody: INotificationWorkflowTriggerInstance.IUpdate = {
    cursor_current_node_id: typia.random<string & tags.Format<"uuid">>(),
    status: "processing",
    attempts: createdInstance.attempts + 1,
    available_at: new Date(Date.now() + 60000).toISOString(),
    payload: JSON.stringify({ message: "payload_updated" }),
  };

  // Step 4: Update trigger instance
  const updatedInstance =
    await api.functional.notificationWorkflow.systemAdmin.triggerInstances.update(
      connection,
      {
        triggerInstanceId: createdInstance.id,
        body: updateBody,
      },
    );
  typia.assert(updatedInstance);

  // Step 5: Validate updated fields
  TestValidator.equals(
    "validate updated cursor_current_node_id",
    updatedInstance.cursor_current_node_id,
    updateBody.cursor_current_node_id,
  );
  TestValidator.equals(
    "validate updated status",
    updatedInstance.status,
    updateBody.status,
  );
  TestValidator.equals(
    "validate updated attempts",
    updatedInstance.attempts,
    updateBody.attempts,
  );
  TestValidator.equals(
    "validate updated available_at",
    updatedInstance.available_at,
    updateBody.available_at,
  );
  TestValidator.equals(
    "validate updated payload",
    updatedInstance.payload,
    updateBody.payload,
  );
}
