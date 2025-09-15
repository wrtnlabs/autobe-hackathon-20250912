import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";

/**
 * Verify the 'update' endpoint for tasks under a manager's task group.
 *
 * The test follows these steps:
 *
 * 1. Create and authenticate a manager user.
 * 2. Generate realistic update data for the task.
 * 3. Invoke the update API endpoint with task group and task identifiers.
 * 4. Validate the returned updated task object measurement with typia.assert.
 * 5. Verify that updated fields match the input data, including null handling.
 *
 * This test confirms that the update operation works as expected with valid
 * manager authentication and proper input.
 */
export async function test_api_task_update_success_with_manager_auth(
  connection: api.IConnection,
) {
  // Step 1: Manager registration and authentication
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(manager);

  // For testing, generate realistic UUIDs for taskGroupId and taskId
  const taskGroupId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const taskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 2: Prepare update data for the task
  const updateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    // Provide a descriptive paragraph for description
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IJobPerformanceEvalTask.IUpdate;

  // Step 3: Call the update API
  const updatedTask: IJobPerformanceEvalTask =
    await api.functional.jobPerformanceEval.manager.taskGroups.tasks.update(
      connection,
      {
        taskGroupId,
        taskId,
        body: updateBody,
      },
    );

  // Step 4: Validate the response type
  typia.assert(updatedTask);

  // Step 5: Verify updated fields match input (description nullable, check null equivalence)
  TestValidator.equals("updated task code", updatedTask.code, updateBody.code!);
  TestValidator.equals("updated task name", updatedTask.name, updateBody.name!);
  if (updateBody.description === null) {
    TestValidator.equals(
      "updated task description is null",
      updatedTask.description,
      null,
    );
  } else if (updateBody.description === undefined) {
    // If undefined, it means no change, so just ensure the field exists
    TestValidator.predicate(
      "updated task description defined",
      updatedTask.description !== undefined,
    );
  } else {
    TestValidator.equals(
      "updated task description",
      updatedTask.description,
      updateBody.description,
    );
  }
}
