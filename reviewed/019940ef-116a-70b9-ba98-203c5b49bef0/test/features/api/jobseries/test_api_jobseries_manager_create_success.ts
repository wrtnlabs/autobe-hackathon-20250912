import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * E2E test for manager user creating a job series under a valid job group.
 *
 * First, creates a new manager via the /auth/manager/join endpoint. Then,
 * simulates creation of a job group by generating a UUID since the job group
 * creation API is not available. Finally, attempts to create a job series
 * linked to the simulated job group.
 *
 * Validations include ensuring returned DTOs have all required properties,
 * timestamps in ISO 8601 format, and correct linkage between job series and job
 * group.
 *
 * This test covers the complete flow from authentication to business entity
 * creation with validation of critical fields.
 */
export async function test_api_jobseries_manager_create_success(
  connection: api.IConnection,
) {
  // Step 1: Manager user join
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerBody = {
    email: managerEmail,
    password: "Password123!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerBody,
    });
  typia.assert(manager);

  // Step 2: Simulated creation of job group with a random UUID
  // No actual API for job group creation provided, so use a random UUID
  const jobGroupId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create a job series under the created job group
  // Generate code with upper-case alphanumeric, length 6 as a better code format
  const code = ArrayUtil.repeat(6, () =>
    RandomGenerator.alphaNumeric(1).toUpperCase(),
  ).join("");
  const jobSeriesCreateBody = {
    job_group_id: jobGroupId,
    code: code,
    name: RandomGenerator.name(2),
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

  // Validate linkage and properties
  TestValidator.equals(
    "job series job_group_id matches",
    jobSeries.job_group_id,
    jobGroupId,
  );
  TestValidator.predicate(
    "job series has an id",
    typeof jobSeries.id === "string" && jobSeries.id.length > 0,
  );
  TestValidator.equals(
    "job series code matches",
    jobSeries.code,
    jobSeriesCreateBody.code,
  );
  TestValidator.equals(
    "job series name matches",
    jobSeries.name,
    jobSeriesCreateBody.name,
  );

  // created_at and updated_at should be valid ISO 8601 date-time strings
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    typeof jobSeries.created_at === "string" &&
      !isNaN(Date.parse(jobSeries.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    typeof jobSeries.updated_at === "string" &&
      !isNaN(Date.parse(jobSeries.updated_at)),
  );

  // deleted_at should be null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    jobSeries.deleted_at === null || jobSeries.deleted_at === undefined,
  );
}
