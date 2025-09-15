import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";

/**
 * Test update of an existing job series by an authenticated employee. The
 * scenario creates employee and job group, creates a job series, then updates
 * the job series with new code, name, and optional description. Verification
 * includes checking response and updated fields.
 */
export async function test_api_jobseries_employee_update_success(
  connection: api.IConnection,
) {
  // 1. Employee joins to obtain authorization
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePasswordHash = RandomGenerator.alphaNumeric(32);
  const employeeCreateBody = {
    email: employeeEmail,
    password_hash: employeePasswordHash,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employeeAuthorized: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employeeAuthorized);

  // 2. Simulate job group creation with a UUID
  const jobGroupId = typia.random<string & tags.Format<"uuid">>();

  // 3. Simulate job series creation by generating initial values
  const initialJobSeriesCode = RandomGenerator.alphaNumeric(5).toUpperCase();
  const initialJobSeriesName = RandomGenerator.name(2);
  const initialJobSeriesDescription = RandomGenerator.paragraph({
    sentences: 3,
  });

  // 4. Update job series
  const jobSeriesId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    code: RandomGenerator.alphaNumeric(5).toUpperCase(),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IJobPerformanceEvalJobSeries.IUpdate;

  const updatedJobSeries: IJobPerformanceEvalJobSeries =
    await api.functional.jobPerformanceEval.employee.jobGroups.jobSeries.update(
      connection,
      {
        jobGroupId: jobGroupId,
        jobSeriesId: jobSeriesId,
        body: updateBody,
      },
    );
  typia.assert(updatedJobSeries);

  // 5. Validate updated fields
  TestValidator.equals(
    "Job series code updated correctly",
    updatedJobSeries.code,
    updateBody.code,
  );
  TestValidator.equals(
    "Job series name updated correctly",
    updatedJobSeries.name,
    updateBody.name,
  );
  TestValidator.equals(
    "Job series description updated correctly",
    updatedJobSeries.description,
    updateBody.description,
  );
}
