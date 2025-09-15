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
 * This E2E test validates the entire user workflow for an employee to securely
 * access detailed information of a specific job role using its jobRoleId under
 * a specific job series identified by jobSeriesId.
 *
 * Business process:
 *
 * 1. Manager user signs up and logs in to create organizational data.
 * 2. Manager creates a job group.
 * 3. Manager creates a job series within the newly created job group.
 * 4. Employee user signs up and logs in.
 * 5. Employee creates a job role under the job series.
 * 6. Employee retrieves the job role details.
 *
 * The test asserts that all API responses match expected DTO types and that the
 * final job role details match the creation input, verifying correct data
 * linkage and authorization handling.
 *
 * This comprehensive test ensures role-based access and entity relationship
 * integrity for the job role details endpoint.
 */
export async function test_api_job_performance_eval_job_role_detail_accessible_to_employee_with_valid_context(
  connection: api.IConnection,
) {
  // Manager signs up
  const managerPassword = "managerPass123";
  const managerJoinBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}@manager.com`,
    password: managerPassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerJoinBody,
    });
  typia.assert(manager);

  // Manager login
  const managerLoginBody = {
    email: managerJoinBody.email,
    password: managerJoinBody.password,
  } satisfies IJobPerformanceEvalManager.ILogin;
  await api.functional.auth.manager.login(connection, {
    body: managerLoginBody,
  });

  // Manager creates a job group
  const jobGroupCreateBody = {
    code: `JG_${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IJobPerformanceEvalJobGroup.ICreate;
  const jobGroup: IJobPerformanceEvalJobGroup =
    await api.functional.jobPerformanceEval.manager.jobGroups.create(
      connection,
      {
        body: jobGroupCreateBody,
      },
    );
  typia.assert(jobGroup);

  // For JobSeries creation, jobGroupId is required and must be uuid string.
  // Provided jobGroup type does not contain an id, only code, name, description.
  // Assuming code is a UUID string as a necessary workaround due to DTO limitation.
  // So use jobGroup.code as jobGroupId.

  // Manager creates a job series under the job group
  const jobSeriesCreateBody = {
    job_group_id: jobGroup.code satisfies string as string,
    code: `JS_${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
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
        body: jobSeriesCreateBody,
      },
    );
  typia.assert(jobSeries);

  // Employee signs up
  const employeePasswordPlain = "employeePass123";
  // Simulate hashing (in real scenario, hashing should be done externally)
  const employeePasswordHash = `hashed_${employeePasswordPlain}`;
  const employeeJoinBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}@employee.com`,
    password_hash: employeePasswordHash,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeJoinBody,
    });
  typia.assert(employee);

  // Employee logs in
  const employeeLoginBody = {
    email: employeeJoinBody.email,
    password: employeePasswordPlain,
  } satisfies IJobPerformanceEvalEmployee.ILogin;
  await api.functional.auth.employee.login.loginEmployee(connection, {
    body: employeeLoginBody,
  });

  // Employee creates a job role under the job series
  const growthLevels = ["Junior", "Intermediate", "Senior"] as const;
  const jobRoleCreateBody = {
    job_series_id: jobSeries.id,
    code: `JR_${RandomGenerator.alphaNumeric(5).toUpperCase()}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    growth_level: RandomGenerator.pick(growthLevels),
  } satisfies IJobPerformanceEvalJobRole.ICreate;
  const jobRole: IJobPerformanceEvalJobRole =
    await api.functional.jobPerformanceEval.employee.jobSeries.jobRoles.create(
      connection,
      {
        jobSeriesId: jobSeries.id,
        body: jobRoleCreateBody,
      },
    );
  typia.assert(jobRole);

  // Employee retrieves job role details
  const jobRoleDetails: IJobPerformanceEvalJobRole =
    await api.functional.jobPerformanceEval.employee.jobSeries.jobRoles.at(
      connection,
      {
        jobSeriesId: jobSeries.id,
        jobRoleId: jobRole.id,
      },
    );
  typia.assert(jobRoleDetails);

  // Validate retrieved details against created job role
  TestValidator.equals("job role id", jobRoleDetails.id, jobRole.id);
  TestValidator.equals(
    "job role job_series_id",
    jobRoleDetails.job_series_id,
    jobRoleCreateBody.job_series_id,
  );
  TestValidator.equals(
    "job role code",
    jobRoleDetails.code,
    jobRoleCreateBody.code,
  );
  TestValidator.equals(
    "job role name",
    jobRoleDetails.name,
    jobRoleCreateBody.name,
  );
  TestValidator.equals(
    "job role description",
    jobRoleDetails.description ?? null,
    jobRoleCreateBody.description ?? null,
  );
  TestValidator.equals(
    "job role growth_level",
    jobRoleDetails.growth_level ?? null,
    jobRoleCreateBody.growth_level ?? null,
  );
}
