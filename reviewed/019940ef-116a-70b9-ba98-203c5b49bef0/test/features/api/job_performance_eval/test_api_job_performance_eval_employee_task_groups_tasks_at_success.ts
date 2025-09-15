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
import type { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";
import type { IJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskGroup";

/**
 * Validate the retrieval of a detailed task entity under a specified task group
 * by an employee user.
 *
 * This test performs the entire preparatory workflow of creating the involved
 * data hierarchy including authentication, job group, job series, job role,
 * task group, and task creation. It finishes by retrieving the created task
 * info via the GET API call.
 *
 * The test ensures that authentication contexts switch between manager and
 * employee roles correctly, and that the hierarchical entities align properly.
 *
 * All API responses are validated with typia.assert to confirm contract
 * compliance.
 */
export async function test_api_job_performance_eval_employee_task_groups_tasks_at_success(
  connection: api.IConnection,
) {
  // 1. Employee signs up and authenticates
  const employeeCreate = {
    email: `employee_${RandomGenerator.alphaNumeric(8)}@company.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreate,
    });
  typia.assert(employee);

  // 2. Manager signs up and authenticates
  const managerCreate = {
    email: `manager_${RandomGenerator.alphaNumeric(8)}@company.com`,
    password: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreate,
    });
  typia.assert(manager);

  // 3. Manager logs in
  await api.functional.auth.manager.login(connection, {
    body: {
      email: managerCreate.email,
      password: managerCreate.password,
    } satisfies IJobPerformanceEvalManager.ILogin,
  });

  // 4. Manager creates job group
  const jobGroupCreate = {
    code: `JG-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IJobPerformanceEvalJobGroup.ICreate;
  const jobGroup: IJobPerformanceEvalJobGroup =
    await api.functional.jobPerformanceEval.manager.jobGroups.create(
      connection,
      {
        body: jobGroupCreate,
      },
    );
  typia.assert(jobGroup);

  // 5. Manager creates job series under job group
  const jobSeriesCreate = {
    job_group_id: jobGroup.code satisfies string as string, // job_group_id must be a string UUID but we have no ID, so casting jobGroup.code
    code: `JS-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IJobPerformanceEvalJobSeries.ICreate;
  const jobSeries: IJobPerformanceEvalJobSeries =
    await api.functional.jobPerformanceEval.manager.jobGroups.jobSeries.create(
      connection,
      {
        jobGroupId: jobGroup.code satisfies string as string,
        body: jobSeriesCreate,
      },
    );
  typia.assert(jobSeries);

  // 6. Manager creates job role under job series
  const jobRoleCreate = {
    job_series_id: jobSeries.id,
    code: `JR-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    growth_level: null,
  } satisfies IJobPerformanceEvalJobRole.ICreate;
  const jobRole: IJobPerformanceEvalJobRole =
    await api.functional.jobPerformanceEval.manager.jobSeries.jobRoles.create(
      connection,
      {
        jobSeriesId: jobSeries.id,
        body: jobRoleCreate,
      },
    );
  typia.assert(jobRole);

  // 7. Employee logs in
  await api.functional.auth.employee.login.loginEmployee(connection, {
    body: {
      email: employeeCreate.email,
      password: employeeCreate.password_hash,
    } satisfies IJobPerformanceEvalEmployee.ILogin,
  });

  // 8. Employee creates a task group under job role
  const taskGroupCreate = {
    job_role_id: jobRole.id,
    code: `TG-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IJobPerformanceEvalTaskGroup.ICreate;
  const taskGroup: IJobPerformanceEvalTaskGroup =
    await api.functional.jobPerformanceEval.employee.jobRoles.taskGroups.createTaskGroup(
      connection,
      {
        jobRoleId: jobRole.id satisfies string as string,
        body: taskGroupCreate,
      },
    );
  typia.assert(taskGroup);

  // 9. Employee creates a task under task group
  const taskCreate = {
    task_group_id: taskGroup.id,
    code: `T-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 5,
      wordMax: 7,
    }),
    knowledge_area_id: null,
  } satisfies IJobPerformanceEvalTask.ICreate;
  const task: IJobPerformanceEvalTask =
    await api.functional.jobPerformanceEval.employee.taskGroups.tasks.create(
      connection,
      {
        taskGroupId: taskGroup.id,
        body: taskCreate,
      },
    );
  typia.assert(task);

  // 10. Employee requests to get detailed task information
  const foundTask: IJobPerformanceEvalTask =
    await api.functional.jobPerformanceEval.employee.taskGroups.tasks.at(
      connection,
      {
        taskGroupId: taskGroup.id,
        taskId: task.id,
      },
    );
  typia.assert(foundTask);

  TestValidator.equals("task ID should match", foundTask.id, task.id);
  TestValidator.equals(
    "task group ID should match",
    foundTask.task_group_id,
    taskGroup.id,
  );
}
