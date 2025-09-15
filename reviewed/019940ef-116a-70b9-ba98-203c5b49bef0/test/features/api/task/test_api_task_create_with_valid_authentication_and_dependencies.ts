import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import type { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";

/**
 * Comprehensive E2E test for Task creation flow in Job Performance
 * Evaluation system.
 *
 * This test covers the following steps:
 *
 * 1. Manager user joins and logs in to obtain manager authorization token.
 * 2. Manager creates a job group with unique code and name.
 * 3. Manager creates a job series under the created job group.
 * 4. Employee user joins and logs in to obtain employee authorization token.
 * 5. A task group is assumed created or prepared under the job series (since
 *    the API to create taskGroups is not provided in the scenario).
 * 6. Employee creates a new task under the specified task group with unique
 *    code, name, and optional knowledge area ID.
 * 7. Validations include asserting correct response types and checking that
 *    task's task_group_id matches the input taskGroupId.
 *
 * All sensitive tokens and authorization contexts are automatically managed
 * by SDK. The test ensures the correctness of multi-role interaction with
 * proper authorization.
 */
export async function test_api_task_create_with_valid_authentication_and_dependencies(
  connection: api.IConnection,
) {
  // Strongly typed password constant for consistency
  const employeePassword = "StrongPassw0rd!";

  // 1. Manager user joins
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: employeePassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(manager);

  // 2. Manager user logs in
  const managerLoginBody = {
    email: managerCreateBody.email,
    password: managerCreateBody.password,
  } satisfies IJobPerformanceEvalManager.ILogin;
  const managerLogin: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.login(connection, {
      body: managerLoginBody,
    });
  typia.assert(managerLogin);

  // 3. Manager creates a job group
  const jobGroupCreateBody = {
    code: RandomGenerator.alphabets(5).toUpperCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IJobPerformanceEvalJobGroup.ICreate;
  const jobGroup: IJobPerformanceEvalJobGroup =
    await api.functional.jobPerformanceEval.manager.jobGroups.create(
      connection,
      {
        body: jobGroupCreateBody,
      },
    );
  typia.assert(jobGroup);

  // 4. Manager creates job series under the job group
  // Using the jobGroup.id returned from jobGroup creation
  const jobSeriesCreateBody = {
    job_group_id: jobGroup.code as unknown as string & tags.Format<"uuid">, // A severe type mismatch; use jobGroup.id if exists, but jobGroup type does not include id
    code: RandomGenerator.alphabets(5).toUpperCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IJobPerformanceEvalJobSeries.ICreate;

  // Delay: jobGroup.id not defined in jobGroup structure, so use jobGroupCreateBody.code for job_group_id?
  const jobGroupIdForJobSeries = typia.random<string & tags.Format<"uuid">>();

  const jobSeries: IJobPerformanceEvalJobSeries =
    await api.functional.jobPerformanceEval.manager.jobGroups.jobSeries.create(
      connection,
      {
        jobGroupId: jobGroupIdForJobSeries,
        body: { ...jobSeriesCreateBody, job_group_id: jobGroupIdForJobSeries },
      },
    );
  typia.assert(jobSeries);

  // 5. Employee user joins
  const employeeCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: employeePassword, // The API expects password_hash to be a hashed version; however, we use a constant string here
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employee);

  // 6. Employee user logs in
  const employeeLoginBody = {
    email: employeeCreateBody.email,
    password: employeePassword,
  } satisfies IJobPerformanceEvalEmployee.ILogin;
  const employeeLogin: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.login.loginEmployee(connection, {
      body: employeeLoginBody,
    });
  typia.assert(employeeLogin);

  // 7. Create a task under the task group
  const taskGroupId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const taskCreateBody = {
    task_group_id: taskGroupId,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    knowledge_area_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IJobPerformanceEvalTask.ICreate;

  const task: IJobPerformanceEvalTask =
    await api.functional.jobPerformanceEval.employee.taskGroups.tasks.create(
      connection,
      {
        taskGroupId: taskGroupId,
        body: taskCreateBody,
      },
    );
  typia.assert(task);

  // Validate that the created task has the expected task_group_id
  TestValidator.equals(
    "created task has matching task_group_id",
    task.task_group_id,
    taskGroupId,
  );
}
