import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";

export async function test_api_task_create_with_missing_dependency_taskgroup_not_found(
  connection: api.IConnection,
) {
  // 1. Manager user sign-up
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = RandomGenerator.alphaNumeric(10);
  const managerAuthorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: managerPassword,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(managerAuthorized);

  // 2. Employee user sign-up #1
  const employeeEmail1 = typia.random<string & tags.Format<"email">>();
  const employeePassword1 = RandomGenerator.alphaNumeric(10);
  const employeeAuthorized1: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email: employeeEmail1,
        password_hash: employeePassword1,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employeeAuthorized1);

  // 3. Employee user sign-up #2 (for multi-actor authentication context)
  const employeeEmail2 = typia.random<string & tags.Format<"email">>();
  const employeePassword2 = RandomGenerator.alphaNumeric(10);
  const employeeAuthorized2: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email: employeeEmail2,
        password_hash: employeePassword2,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employeeAuthorized2);

  // 4. Employee user login to switch auth role
  await api.functional.auth.employee.login.loginEmployee(connection, {
    body: {
      email: employeeEmail1,
      password: employeePassword1,
    } satisfies IJobPerformanceEvalEmployee.ILogin,
  });

  // 5. Attempt to create a task with a non-existent task group UUID
  const fakeTaskGroupId = typia.random<string & tags.Format<"uuid">>();
  const createInput = {
    task_group_id: fakeTaskGroupId,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    knowledge_area_id: null, // Explicitly null as allowed
  } satisfies IJobPerformanceEvalTask.ICreate;

  await TestValidator.error(
    "Task creation should fail with not found for missing task group",
    async () => {
      await api.functional.jobPerformanceEval.employee.taskGroups.tasks.create(
        connection,
        {
          taskGroupId: fakeTaskGroupId,
          body: createInput,
        },
      );
    },
  );
}
