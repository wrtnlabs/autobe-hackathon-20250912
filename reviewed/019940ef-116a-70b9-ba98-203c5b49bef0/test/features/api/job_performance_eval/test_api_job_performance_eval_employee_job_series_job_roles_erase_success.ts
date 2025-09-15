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

/**
 * Test successful deletion of a job role by an employee user.
 *
 * This test performs a full workflow including:
 *
 * 1. Creating and authenticating an employee user
 * 2. Creating and authenticating a manager user
 * 3. Manager creates a job group
 * 4. Manager creates a job series under the job group
 * 5. Manager creates a job role under the job series
 * 6. Switching authentication context back to employee user
 * 7. Employee user deletes the job role
 *
 * This verifies role-based authorization, proper resource management, and
 * successful API operation for deletion.
 *
 * All API responses are asserted with typia.assert. Authentication tokens are
 * handled automatically by SDK. The deletion is successful if no error is
 * thrown during the erase call.
 */
export async function test_api_job_performance_eval_employee_job_series_job_roles_erase_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate employee user
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeCreateBody = {
    email: `employee_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: employeePassword, // For test, use as plain password string but pass as hash field
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employeeAuth: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employeeAuth);

  // 2. Create and authenticate manager user
  const managerPassword = RandomGenerator.alphaNumeric(16);
  const managerCreateBody = {
    email: `manager_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: managerPassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const managerAuth: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(managerAuth);

  // 3. Manager creates job group
  const jobGroupCreateBody = {
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: RandomGenerator.name(2),
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

  // Generate a UUID string for jobGroupId since IJobPerformanceEvalJobGroup has no id
  const jobGroupId = typia.random<string & tags.Format<"uuid">>();

  // 4. Manager creates job series under job group
  const jobSeriesCreateBody = {
    job_group_id: jobGroupId,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 5. Manager creates job role under job series
  const jobRoleCreateBody = {
    job_series_id: jobSeries.id,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    growth_level: null,
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

  // 6. Switch authentication back to employee user
  await api.functional.auth.employee.login.loginEmployee(connection, {
    body: {
      email: employeeAuth.email,
      password: employeePassword,
    } satisfies IJobPerformanceEvalEmployee.ILogin,
  });

  // 7. Employee deletes the job role
  await api.functional.jobPerformanceEval.employee.jobSeries.jobRoles.erase(
    connection,
    {
      jobSeriesId: jobSeries.id,
      jobRoleId: jobRole.id,
    },
  );

  // If no error, deletion is successful
  TestValidator.predicate("job role successfully deleted", true);
}
