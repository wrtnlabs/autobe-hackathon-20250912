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

export async function test_api_task_group_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Employee joins
  const employeeCreateBody = {
    email:
      RandomGenerator.name(1).toLowerCase().replace(/\s/g, "") + "@example.com",
    name: RandomGenerator.name(),
    password_hash: "hashedpassword123",
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employee);

  // 2. Manager joins
  const managerCreateBody = {
    email:
      RandomGenerator.name(1).toLowerCase().replace(/\s/g, "") + "@company.com",
    name: RandomGenerator.name(),
    password: "managerpassword",
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(manager);

  // 3. Manager login (to switch auth context explicitly)
  await api.functional.auth.manager.login(connection, {
    body: {
      email: managerCreateBody.email,
      password: managerCreateBody.password,
    } satisfies IJobPerformanceEvalManager.ILogin,
  });

  // 4. Create job group as manager
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

  // Generate consistent UUID for jobGroupId
  const jobGroupId = typia.random<string & tags.Format<"uuid">>();

  // 5. Create job series under job group
  const jobSeriesCreateBody = {
    job_group_id: jobGroupId,
    code: RandomGenerator.alphabets(5).toUpperCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IJobPerformanceEvalJobSeries.ICreate;
  const jobSeries: IJobPerformanceEvalJobSeries =
    await api.functional.jobPerformanceEval.manager.jobGroups.jobSeries.create(
      connection,
      {
        jobGroupId: jobGroupId,
        body: jobSeriesCreateBody,
      },
    );
  typia.assert(jobSeries);

  // 6. Create job role under created job series
  const jobRoleCreateBody = {
    job_series_id: jobSeries.id,
    code: RandomGenerator.alphabets(6).toUpperCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    growth_level: "Intermediate",
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

  // 7. Employee login to switch authentication back
  await api.functional.auth.employee.login.loginEmployee(connection, {
    body: {
      email: employeeCreateBody.email,
      password: "hashedpassword123",
    } satisfies IJobPerformanceEvalEmployee.ILogin,
  });

  // 8. Create task group under job role (employee context)
  const taskGroupCreateBody = {
    job_role_id: jobRole.id,
    code: RandomGenerator.alphabets(5).toUpperCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 9. Retrieve detailed task group info by jobRoleId and taskGroupId (employee context)
  const retrievedTaskGroup: IJobPerformanceEvalTaskGroup =
    await api.functional.jobPerformanceEval.employee.jobRoles.taskGroups.at(
      connection,
      {
        jobRoleId: jobRole.id,
        taskGroupId: taskGroup.id,
      },
    );
  typia.assert(retrievedTaskGroup);

  // 10. Validate that retrieved task group matches created task group
  TestValidator.equals(
    "Task group ID matches",
    retrievedTaskGroup.id,
    taskGroup.id,
  );
  TestValidator.equals(
    "Job role ID matches",
    retrievedTaskGroup.job_role_id,
    taskGroup.job_role_id,
  );
  TestValidator.equals(
    "Task group code matches",
    retrievedTaskGroup.code,
    taskGroup.code,
  );
  TestValidator.equals(
    "Task group name matches",
    retrievedTaskGroup.name,
    taskGroup.name,
  );
  TestValidator.equals(
    "Task group description matches",
    retrievedTaskGroup.description ?? null,
    taskGroup.description ?? null,
  );
  TestValidator.equals(
    "Created at timestamp matches",
    retrievedTaskGroup.created_at,
    taskGroup.created_at,
  );
  TestValidator.equals(
    "Updated at timestamp matches",
    retrievedTaskGroup.updated_at,
    taskGroup.updated_at,
  );
  TestValidator.equals(
    "Deleted at timestamp matches",
    retrievedTaskGroup.deleted_at ?? null,
    taskGroup.deleted_at ?? null,
  );
}
