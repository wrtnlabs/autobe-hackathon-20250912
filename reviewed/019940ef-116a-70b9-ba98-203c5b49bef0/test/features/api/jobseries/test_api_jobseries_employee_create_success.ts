import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";

/**
 * Test employee user creation of a job series within a valid job group.
 *
 * This test performs the following steps:
 *
 * 1. Creates an employee user to obtain authentication token.
 * 2. Repeats employee creation for independent authentication contexts if needed.
 * 3. Creates a job series under a dynamically generated job group UUID.
 *
 * The test verifies that the job series creation is successful, the response
 * structure matches expected types, and the data consistency is validated.
 */
export async function test_api_jobseries_employee_create_success(
  connection: api.IConnection,
) {
  // Step 1. Create employee user and authenticate
  const employeeCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employee);

  // Step 2. Create another employee user for authentication context (dependency 2)
  const employeeCreateBody2 = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee2: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody2,
    });
  typia.assert(employee2);

  // Step 3. Create yet another employee authentication context (dependency 3)
  const employeeCreateBody3 = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employee3: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody3,
    });
  typia.assert(employee3);

  // Step 4. Create a job group UUID to use for the job series
  const jobGroupId = typia.random<string & tags.Format<"uuid">>();

  // Step 5. Create job series under the job group
  const jobSeriesCreateBody = {
    job_group_id: jobGroupId,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IJobPerformanceEvalJobSeries.ICreate;

  const jobSeries: IJobPerformanceEvalJobSeries =
    await api.functional.jobPerformanceEval.employee.jobGroups.jobSeries.create(
      connection,
      {
        jobGroupId,
        body: jobSeriesCreateBody,
      },
    );
  typia.assert(jobSeries);

  // Step 6. Assert returned job series data
  TestValidator.equals(
    "jobGroupId matches",
    jobSeries.job_group_id,
    jobGroupId,
  );
  TestValidator.equals(
    "code matches",
    jobSeries.code,
    jobSeriesCreateBody.code,
  );
  TestValidator.equals(
    "name matches",
    jobSeries.name,
    jobSeriesCreateBody.name,
  );
  TestValidator.equals(
    "description matches",
    jobSeries.description,
    jobSeriesCreateBody.description,
  );

  // Step 7. Validate timestamps existence
  TestValidator.predicate("created_at is valid ISO date", () => {
    const date = new Date(jobSeries.created_at);
    return !isNaN(date.getTime());
  });

  TestValidator.predicate("updated_at is valid ISO date", () => {
    const date = new Date(jobSeries.updated_at);
    return !isNaN(date.getTime());
  });

  // Step 8. Validate deleted_at is null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    jobSeries.deleted_at === null || jobSeries.deleted_at === undefined,
  );
}
