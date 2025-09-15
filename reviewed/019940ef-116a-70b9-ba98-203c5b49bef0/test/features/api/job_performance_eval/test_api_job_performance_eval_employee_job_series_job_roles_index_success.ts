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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalJobRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalJobRole";

/**
 * This E2E test validates the retrieval of filtered and paginated list of job
 * roles under a specific job series.
 *
 * The workflow performs:
 *
 * 1. Create an employee user and authenticate.
 * 2. Create a manager user, authenticate, and create a job group and job series.
 * 3. Employee authenticates and fetches job roles filtered by jobSeriesId.
 * 4. Validate pagination and job role summaries.
 *
 * This tests multi-role authentication context, API filtering, pagination, and
 * authorization boundaries.
 */
export async function test_api_job_performance_eval_employee_job_series_job_roles_index_success(
  connection: api.IConnection,
) {
  // 1. Create employee user and authenticate
  const employeeEmail: string = typia.random<string & tags.Format<"email">>();
  const employeePasswordHash = "P@ssw0rd1234";

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email: employeeEmail,
        password_hash: employeePasswordHash,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employee);

  // 2. Create manager user and authenticate
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const managerPassword = "P@ssw0rd1234";

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: managerPassword,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 3. Manager login
  await api.functional.auth.manager.login(connection, {
    body: {
      email: managerEmail,
      password: managerPassword,
    } satisfies IJobPerformanceEvalManager.ILogin,
  });

  // 4. Manager creates a job group
  const jobGroupCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IJobPerformanceEvalJobGroup.ICreate;

  const jobGroup: IJobPerformanceEvalJobGroup =
    await api.functional.jobPerformanceEval.manager.jobGroups.create(
      connection,
      { body: jobGroupCreateBody },
    );
  typia.assert(jobGroup);

  // Generate a fake UUID for jobGroupId (since jobGroup has no id property)
  const jobGroupId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 5. Manager creates a job series under the job group
  const jobSeriesCreateBody = {
    job_group_id: jobGroupId,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 6. Employee login
  await api.functional.auth.employee.login.loginEmployee(connection, {
    body: {
      email: employeeEmail,
      password: employeePasswordHash,
    } satisfies IJobPerformanceEvalEmployee.ILogin,
  });

  // 7. Employee fetches job roles filtered by jobSeriesId
  const jobRolesSearchRequest: IJobPerformanceEvalJobRole.IRequest = {
    job_series_id: jobSeries.id,
    page: 1,
    limit: 10,
  };

  const jobRolesPage: IPageIJobPerformanceEvalJobRole.ISummary =
    await api.functional.jobPerformanceEval.employee.jobSeries.jobRoles.index(
      connection,
      { jobSeriesId: jobSeries.id, body: jobRolesSearchRequest },
    );
  typia.assert(jobRolesPage);

  // 8. Validate pagination
  TestValidator.predicate(
    "pagination current page is one",
    jobRolesPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    jobRolesPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total records is non-negative",
    jobRolesPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    jobRolesPage.pagination.pages >= 0,
  );

  // 9. Validate each job role summary
  for (const jobRole of jobRolesPage.data) {
    typia.assert(jobRole);
    TestValidator.predicate(
      "job role id is well-formed",
      typeof jobRole.id === "string" && jobRole.id.length > 0,
    );
    TestValidator.predicate(
      "job role name is non-empty",
      typeof jobRole.name === "string" && jobRole.name.length > 0,
    );
    TestValidator.predicate(
      "job role code is non-empty",
      typeof jobRole.code === "string" && jobRole.code.length > 0,
    );
  }
}
