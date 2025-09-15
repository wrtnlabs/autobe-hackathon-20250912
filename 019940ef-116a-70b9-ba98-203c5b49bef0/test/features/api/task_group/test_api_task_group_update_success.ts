import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import type { IJobPerformanceEvalJobRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobRole";
import type { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskGroup";

/**
 * This test verifies that an existing task group can be successfully
 * updated by an authenticated employee. The test ensures the entire object
 * hierarchy is properly created beforehand by authenticating manager and
 * employee roles and creating job group, job series, job role, and task
 * group entities. The update operation changes the code, name, and
 * description fields of a task group. After update, the updated task group
 * details are asserted to match exactly the changes made.
 */
export async function test_api_task_group_update_success(
  connection: api.IConnection,
) {
  // 1. Employee joins and authenticates
  const employeeJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeJoinBody,
    });
  typia.assert(employee);

  // 2. Employee logs in
  const employeeLoginBody = {
    email: employeeJoinBody.email,
    password: employeeJoinBody.password_hash,
  } satisfies IJobPerformanceEvalEmployee.ILogin;
  const employeeAuth: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.login.loginEmployee(connection, {
      body: employeeLoginBody,
    });
  typia.assert(employeeAuth);

  // 3. Manager joins and authenticates
  const managerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerJoinBody,
    });
  typia.assert(manager);

  // 4. Manager logs in
  const managerLoginBody = {
    email: managerJoinBody.email,
    password: managerJoinBody.password,
  } satisfies IJobPerformanceEvalManager.ILogin;
  const managerAuth: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.login(connection, {
      body: managerLoginBody,
    });
  typia.assert(managerAuth);

  // 5. Manager creates a job group
  const jobGroupCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IJobPerformanceEvalJobGroup.ICreate;
  const jobGroup: IJobPerformanceEvalJobGroup =
    await api.functional.jobPerformanceEval.manager.jobGroups.create(
      connection,
      { body: jobGroupCreateBody },
    );
  typia.assert(jobGroup);

  // 6. Manager creates a job series under the job group
  // Creating a UUID to serve as the jobGroupId path param and body.job_group_id
  const jobGroupIdForJobSeries: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const jobSeriesCreateBody = {
    job_group_id: jobGroupIdForJobSeries,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IJobPerformanceEvalJobSeries.ICreate;
  const jobSeries: IJobPerformanceEvalJobSeries =
    await api.functional.jobPerformanceEval.manager.jobGroups.jobSeries.create(
      connection,
      {
        jobGroupId: jobGroupIdForJobSeries,
        body: jobSeriesCreateBody,
      },
    );
  typia.assert(jobSeries);

  // 7. Manager creates a job role under the job series
  const jobRoleCreateBody = {
    job_series_id: jobSeries.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    growth_level: RandomGenerator.alphaNumeric(3),
  } satisfies IJobPerformanceEvalJobRole.ICreate;
  const jobRole: IJobPerformanceEvalJobRole =
    await api.functional.jobPerformanceEval.manager.jobSeries.jobRoles.create(
      connection,
      {
        jobSeriesId: jobSeries.id,
        body: jobRoleCreateBody,
      },
    );
  typia.assert(jobRole);

  // 8. Employee creates a task group under the job role
  const taskGroupCreateBody = {
    job_role_id: jobRole.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IJobPerformanceEvalTaskGroup.ICreate;
  const taskGroup: IJobPerformanceEvalTaskGroup =
    await api.functional.jobPerformanceEval.employee.jobRoles.taskGroups.createTaskGroup(
      connection,
      {
        jobRoleId: jobRole.id,
        body: taskGroupCreateBody,
      },
    );
  typia.assert(taskGroup);

  // 9. Employee updates the task group
  const taskGroupUpdateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IJobPerformanceEvalTaskGroup.IUpdate;
  const updatedTaskGroup: IJobPerformanceEvalTaskGroup =
    await api.functional.jobPerformanceEval.employee.jobRoles.taskGroups.updateTaskGroup(
      connection,
      {
        jobRoleId: jobRole.id,
        taskGroupId: taskGroup.id,
        body: taskGroupUpdateBody,
      },
    );
  typia.assert(updatedTaskGroup);

  // 10. Validate updated properties
  TestValidator.equals(
    "taskGroup code should be updated",
    updatedTaskGroup.code,
    taskGroupUpdateBody.code,
  );
  TestValidator.equals(
    "taskGroup name should be updated",
    updatedTaskGroup.name,
    taskGroupUpdateBody.name,
  );
  TestValidator.equals(
    "taskGroup description should be updated",
    updatedTaskGroup.description,
    taskGroupUpdateBody.description,
  );
}
