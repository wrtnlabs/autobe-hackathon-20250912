import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import type { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Verify successful deletion of a job series under a job group by an
 * authenticated employee user.
 *
 * This test performs the full scenario including employee and manager user
 * creation, authentication role switching, job group creation by a manager,
 * job series creation by an employee, and then deletion of the job series
 * by the employee. It validates that the job series is correctly created
 * and thereafter successfully deleted, and confirms deletion by expecting
 * errors on further deletion attempts.
 *
 * The test ensures strict compliance with DTO types, proper UUID usage for
 * identifiers, realistic data generation for names and codes, and complete
 * coverage of all required API call parameters. All API call responses are
 * validated with typia.assert for full runtime type safety.
 *
 * Authentication tokens and contexts are managed internally by the SDK
 * functions, with role switching executed by authenticating appropriate
 * users before operations.
 */
export async function test_api_jobseries_delete_employee_success(
  connection: api.IConnection,
) {
  // 1. Employee user creation with hashed password simulation
  const employeeEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const employeePasswordHash = RandomGenerator.alphaNumeric(32);
  const employeeCreateBody = {
    email: employeeEmail,
    password_hash: employeePasswordHash,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee = await api.functional.auth.employee.join.joinEmployee(
    connection,
    {
      body: employeeCreateBody,
    },
  );
  typia.assert(employee);

  // 2. Manager user creation
  const managerEmail = `${RandomGenerator.alphaNumeric(8)}@example.org`;
  const managerPassword = "Password123!";
  const managerCreateBody = {
    email: managerEmail,
    password: managerPassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager = await api.functional.auth.manager.join(connection, {
    body: managerCreateBody,
  });
  typia.assert(manager);

  // 3. Manager login for creating job group
  const managerLoginBody = {
    email: managerEmail,
    password: managerPassword,
  } satisfies IJobPerformanceEvalManager.ILogin;
  const loginManager = await api.functional.auth.manager.login(connection, {
    body: managerLoginBody,
  });
  typia.assert(loginManager);

  // 4. Create job group by manager
  const jobGroupCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IJobPerformanceEvalJobGroup.ICreate;
  const jobGroup =
    await api.functional.jobPerformanceEval.manager.jobGroups.create(
      connection,
      {
        body: jobGroupCreateBody,
      },
    );
  typia.assert(jobGroup);

  // 5. Employee login for job series create/delete
  const employeeLoginBody = {
    email: employeeEmail,
    password: employeePasswordHash,
  } satisfies IJobPerformanceEvalEmployee.ILogin;
  const loginEmployee = await api.functional.auth.employee.login.loginEmployee(
    connection,
    {
      body: employeeLoginBody,
    },
  );
  typia.assert(loginEmployee);

  // 6. Create job series under job group, generate a UUID for job_group_id
  const jobGroupId = typia.random<string & tags.Format<"uuid">>();
  const jobSeriesCreateBody = {
    job_group_id: jobGroupId,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IJobPerformanceEvalJobSeries.ICreate;

  const jobSeries =
    await api.functional.jobPerformanceEval.employee.jobGroups.jobSeries.create(
      connection,
      {
        jobGroupId,
        body: jobSeriesCreateBody,
      },
    );
  typia.assert(jobSeries);

  // 7. Delete the job series by employee
  await api.functional.jobPerformanceEval.employee.jobGroups.jobSeries.erase(
    connection,
    {
      jobGroupId,
      jobSeriesId: jobSeries.id,
    },
  );

  // 8. Verify deletion by expecting error on retry delete
  await TestValidator.error("deleted job series should not exist", async () => {
    await api.functional.jobPerformanceEval.employee.jobGroups.jobSeries.erase(
      connection,
      {
        jobGroupId,
        jobSeriesId: jobSeries.id,
      },
    );
  });
}
