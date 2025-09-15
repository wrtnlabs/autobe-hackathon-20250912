import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";

export async function test_api_trigger_instance_creation_success_idempotency_enforcement(
  connection: api.IConnection,
) {
  // 1. Trigger operator user joins (register)
  const triggerOperatorInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;

  const triggerOperator: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      { body: triggerOperatorInput },
    );
  typia.assert(triggerOperator);

  // 2. Prepare trigger instance creation data
  const workflowId = typia.random<string & tags.Format<"uuid">>();
  const idempotencyKey = RandomGenerator.alphabets(10);
  const payloadObject = {
    message: "Test notification payload",
    time: new Date().toISOString(),
  };
  const payload = JSON.stringify(payloadObject);

  const triggerInstanceCreateBody = {
    workflow_id: workflowId,
    idempotency_key: idempotencyKey,
    payload: payload,
  } satisfies INotificationWorkflowTriggerInstance.ICreate;

  // 3. Create the trigger instance
  const firstTriggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.create(
      connection,
      { body: triggerInstanceCreateBody },
    );
  typia.assert(firstTriggerInstance);
  TestValidator.equals(
    "Initial trigger instance status is 'enqueued'",
    firstTriggerInstance.status,
    "enqueued",
  );
  TestValidator.equals(
    "Initial trigger instance attempts count is 0",
    firstTriggerInstance.attempts,
    0,
  );
  TestValidator.equals(
    "Initial trigger instance payload matches input",
    firstTriggerInstance.payload,
    payload,
  );
  TestValidator.predicate(
    "Initial trigger instance available_at is valid ISO date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])[T ]([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])?$/.test(
      firstTriggerInstance.available_at,
    ),
  );

  // 4. Retry creation with the same idempotency key expecting idempotent response
  const secondTriggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.create(
      connection,
      { body: triggerInstanceCreateBody },
    );
  typia.assert(secondTriggerInstance);

  // 5. Assert idempotency: the returned trigger instance id is the same
  TestValidator.equals(
    "Repeated trigger instance id matches initial",
    secondTriggerInstance.id,
    firstTriggerInstance.id,
  );
}
