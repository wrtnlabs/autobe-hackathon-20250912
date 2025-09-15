import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";
import type { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";

/**
 * Validate the update operation for an employee's task activity.
 *
 * This test covers the full happy path workflow of:
 *
 * 1. Creating a new employee user via joinEmployee.
 * 2. Creating a task within a task group to obtain a valid taskId.
 * 3. Creating a task activity under the created task.
 * 4. Updating the created task activity with new code, name, and description.
 * 5. Validating that the update is persisted correctly by checking the
 *    response.
 * 6. Testing that updates fail without authentication or with invalid IDs.
 *
 * The test ensures:
 *
 * - Correct use of role-based authentication.
 * - Proper parameter usage for path variables and request bodies.
 * - Compliance with DTO schemas and business rules.
 * - Robustness with both success and failure paths.
 */
export async function test_api_employee_task_activity_update_success(
  connection: api.IConnection,
) {
  // Step 1: Employee registration and authentication
  const employeeCreateBody = {
    email: `${RandomGenerator.name(1)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employee);

  // Step 2: Create a task group ID for creating a task (simulate UUID)
  const taskGroupId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create a task under the task group
  const taskCreateBody = {
    task_group_id: taskGroupId,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    knowledge_area_id: null,
  } satisfies IJobPerformanceEvalTask.ICreate;

  const task: IJobPerformanceEvalTask =
    await api.functional.jobPerformanceEval.employee.taskGroups.tasks.create(
      connection,
      {
        taskGroupId,
        body: taskCreateBody,
      },
    );
  typia.assert(task);

  // Step 4: Create a task activity under the created task
  const taskActivityCreateBody = {
    task_id: task.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IJobPerformanceEvalTaskActivity.ICreate;

  const taskActivity: IJobPerformanceEvalTaskActivity =
    await api.functional.jobPerformanceEval.employee.tasks.taskActivities.create(
      connection,
      {
        taskId: task.id,
        body: taskActivityCreateBody,
      },
    );
  typia.assert(taskActivity);

  // Step 5: Update the task activity with new values
  const taskActivityUpdateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    task_id: task.id,
  } satisfies IJobPerformanceEvalTaskActivity.IUpdate;

  const updatedTaskActivity: IJobPerformanceEvalTaskActivity =
    await api.functional.jobPerformanceEval.employee.tasks.taskActivities.update(
      connection,
      {
        taskId: task.id,
        taskActivityId: taskActivity.id,
        body: taskActivityUpdateBody,
      },
    );
  typia.assert(updatedTaskActivity);

  // Step 6: Validate that the returned update matches the update request
  TestValidator.equals(
    "task activity code updated",
    updatedTaskActivity.code,
    taskActivityUpdateBody.code,
  );
  TestValidator.equals(
    "task activity name updated",
    updatedTaskActivity.name,
    taskActivityUpdateBody.name,
  );
  TestValidator.equals(
    "task activity description updated",
    updatedTaskActivity.description,
    taskActivityUpdateBody.description,
  );

  // Step 7: Negative tests to ensure update fails without authentication or with invalid ID

  // Emulate unauthenticated connection by cloning with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Expect failure when calling update without authentication
  await TestValidator.error("update fails without authentication", async () => {
    await api.functional.jobPerformanceEval.employee.tasks.taskActivities.update(
      unauthenticatedConnection,
      {
        taskId: task.id,
        taskActivityId: taskActivity.id,
        body: taskActivityUpdateBody,
      },
    );
  });

  // Expect failure with invalid taskActivityId
  await TestValidator.error(
    "update fails with invalid taskActivityId",
    async () => {
      await api.functional.jobPerformanceEval.employee.tasks.taskActivities.update(
        connection,
        {
          taskId: task.id,
          taskActivityId: typia.random<string & tags.Format<"uuid">>(),
          body: taskActivityUpdateBody,
        },
      );
    },
  );
}
