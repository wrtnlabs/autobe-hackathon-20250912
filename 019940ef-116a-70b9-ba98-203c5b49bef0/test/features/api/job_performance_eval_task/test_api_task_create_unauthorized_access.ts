import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";

/**
 * This test validates that attempting to create a job performance
 * evaluation task under a task group without proper employee authentication
 * is forbidden.
 *
 * It verifies role-based access control by simulating unauthorized requests
 * to the task creation endpoint. The test follows these steps:
 *
 * 1. Creates a manager user account.
 * 2. Creates an employee user account with a simulated hashed password.
 * 3. Logs in the employee to establish session (not used for authenticated
 *    task creation).
 * 4. Logs in the manager (not used for authenticated task creation).
 * 5. Attempts to create a task under a random taskGroupId using a connection
 *    without authorization headers.
 * 6. Expects an error to be thrown, indicating unauthorized access is
 *    rejected.
 *
 * This ensures API endpoints handling task creation enforce strict
 * authentication requirements.
 */
export async function test_api_task_create_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Create a manager user account
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const managerPassword = "strongPassword123";
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: managerPassword,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // Step 2: Create an employee user account with a simulated hashed password
  const employeeEmail: string = typia.random<string & tags.Format<"email">>();
  const employeePasswordHash = RandomGenerator.alphaNumeric(64); // Simulated hash
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email: employeeEmail,
        password_hash: employeePasswordHash,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employee);

  // Step 3: Log in employee (establish session, not used for auth resetting here)
  await api.functional.auth.employee.login.loginEmployee(connection, {
    body: {
      email: employeeEmail,
      password: employeePasswordHash,
    } satisfies IJobPerformanceEvalEmployee.ILogin,
  });

  // Step 4: Log in manager (establish session, not used for auth resetting here)
  await api.functional.auth.manager.login(connection, {
    body: {
      email: managerEmail,
      password: managerPassword,
    } satisfies IJobPerformanceEvalManager.ILogin,
  });

  // Step 5: Attempt to create a task with no valid employee authentication
  // Simulate unauthenticated request by creating a new connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };

  const taskGroupId = typia.random<string & tags.Format<"uuid">>();
  const taskBody = {
    task_group_id: taskGroupId,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    knowledge_area_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IJobPerformanceEvalTask.ICreate;

  // Step 6: Expect an error due to unauthorized access
  await TestValidator.error(
    "Unauthorized access to create task without employee token",
    async () => {
      await api.functional.jobPerformanceEval.employee.taskGroups.tasks.create(
        unauthenticatedConnection,
        {
          taskGroupId,
          body: taskBody,
        },
      );
    },
  );
}
