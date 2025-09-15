import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";
import type { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";

/**
 * Test for retrieving detailed task activity information for an employee user.
 *
 * This test covers the following workflow:
 *
 * 1. Employee user registration and authentication.
 * 2. Creation of a task group is assumed; since taskGroup creation API is not
 *    provided, we simulate a valid UUID for taskGroupId.
 * 3. Creation of a task under a valid task group.
 * 4. Creation of a task activity under that task.
 * 5. Retrieval of detailed information for the created task activity using the GET
 *    endpoint.
 * 6. Verification of retrieved data consistency and conformance.
 *
 * Negative tests include:
 *
 * 1. Attempt to retrieve a task activity with a non-existent taskActivityId,
 *    expecting an error.
 * 2. Attempt to retrieve a task activity without authentication, expecting an
 *    unauthorized error.
 */
export async function test_api_employee_task_activity_get_detail_success(
  connection: api.IConnection,
) {
  // 1. Employee user registration
  const employeeCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employee = await api.functional.auth.employee.join.joinEmployee(
    connection,
    { body: employeeCreateBody },
  );
  typia.assert(employee);

  // We must have a taskGroupId for task creation; no creation API, so simulate UUID
  const taskGroupId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create a task under the task group
  const taskCreateBody = {
    task_group_id: taskGroupId,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    knowledge_area_id: null,
  } satisfies IJobPerformanceEvalTask.ICreate;

  const task =
    await api.functional.jobPerformanceEval.employee.taskGroups.tasks.create(
      connection,
      {
        taskGroupId: taskGroupId,
        body: taskCreateBody,
      },
    );
  typia.assert(task);

  // 3. Create a task activity under the task
  const taskActivityCreateBody = {
    task_id: task.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IJobPerformanceEvalTaskActivity.ICreate;

  const taskActivity =
    await api.functional.jobPerformanceEval.employee.tasks.taskActivities.create(
      connection,
      {
        taskId: task.id,
        body: taskActivityCreateBody,
      },
    );
  typia.assert(taskActivity);

  // 4. Retrieve task activity details
  const retrieved =
    await api.functional.jobPerformanceEval.employee.tasks.taskActivities.at(
      connection,
      {
        taskId: task.id,
        taskActivityId: taskActivity.id,
      },
    );

  typia.assert(retrieved);

  // Validate important fields are correct
  TestValidator.equals(
    "Task activity ID matches",
    retrieved.id,
    taskActivity.id,
  );
  TestValidator.equals(
    "Task activity taskId matches",
    retrieved.task_id,
    task.id,
  );
  TestValidator.equals(
    "Task activity code matches",
    retrieved.code,
    taskActivity.code,
  );
  TestValidator.equals(
    "Task activity name matches",
    retrieved.name,
    taskActivity.name,
  );
  TestValidator.equals(
    "Task activity description matches",
    retrieved.description,
    taskActivity.description,
  );
  TestValidator.equals(
    "Task activity created_at presence",
    typeof retrieved.created_at,
    "string",
  );
  TestValidator.equals(
    "Task activity updated_at presence",
    typeof retrieved.updated_at,
    "string",
  );

  // deleted_at may be undefined or null - verify type accordingly
  if (retrieved.deleted_at !== undefined && retrieved.deleted_at !== null) {
    TestValidator.equals(
      "Task activity deleted_at presence",
      typeof retrieved.deleted_at,
      "string",
    );
  }

  // 5. Negative test: attempt retrieving a non-existing task activity ID
  await TestValidator.error(
    "retrieving non-existent task activity should fail",
    async () => {
      await api.functional.jobPerformanceEval.employee.tasks.taskActivities.at(
        connection,
        {
          taskId: task.id,
          taskActivityId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Negative test: attempt retrieving task activity without authentication
  // Create a new connection with empty headers (no auth)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "retrieving task activity without auth should fail",
    async () => {
      await api.functional.jobPerformanceEval.employee.tasks.taskActivities.at(
        unauthenticatedConnection,
        {
          taskId: task.id,
          taskActivityId: taskActivity.id,
        },
      );
    },
  );
}
