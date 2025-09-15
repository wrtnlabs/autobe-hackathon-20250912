import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";

/**
 * Validate update of a task activity by a manager user including valid data
 * update and permission error when unauthorized.
 *
 * This test covers the following scenario:
 *
 * 1. Register a manager user and authenticate
 * 2. Register an employee user for permission testing
 * 3. Manager updates a task activity’s fields (task_id, code, name, description)
 *    with valid data and verifies response
 * 4. Employee user attempts the same update and is expected to receive an
 *    authorization error
 */
export async function test_api_task_activity_update_manager_valid_and_permission_error(
  connection: api.IConnection,
) {
  // Step 1: Manager registers and authenticates
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = "1234";

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: managerPassword,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // Step 2: Employee registers and authenticates
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = "1234";

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email: employeeEmail,
        password_hash: employeePassword,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employee);

  // Generate valid UUIDs for the task and task activity
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const taskActivityId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Manager updates a task activity with valid data
  const updateBody = {
    task_id: taskId,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 2,
      wordMax: 5,
    }),
  } satisfies IJobPerformanceEvalTaskActivity.IUpdate;

  const updatedTaskActivity: IJobPerformanceEvalTaskActivity =
    await api.functional.jobPerformanceEval.manager.tasks.taskActivities.update(
      connection,
      {
        taskId,
        taskActivityId,
        body: updateBody,
      },
    );
  typia.assert(updatedTaskActivity);

  TestValidator.equals(
    "updated task_id matches",
    updatedTaskActivity.task_id,
    updateBody.task_id,
  );
  TestValidator.equals(
    "updated code matches",
    updatedTaskActivity.code,
    updateBody.code,
  );
  TestValidator.equals(
    "updated name matches",
    updatedTaskActivity.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated description matches",
    updatedTaskActivity.description,
    updateBody.description,
  );

  // Step 4: Employee (non-manager) attempts the same update and expects error
  await TestValidator.error(
    "employee cannot update task activity - permission denied",
    async () => {
      await api.functional.jobPerformanceEval.manager.tasks.taskActivities.update(
        connection,
        {
          taskId,
          taskActivityId,
          body: updateBody,
        },
      );
    },
  );
}
