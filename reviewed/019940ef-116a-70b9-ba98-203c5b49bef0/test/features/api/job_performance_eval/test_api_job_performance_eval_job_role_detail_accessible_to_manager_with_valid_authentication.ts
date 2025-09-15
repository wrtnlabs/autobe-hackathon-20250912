import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import type { IJobPerformanceEvalJobRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobRole";
import type { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Validate that a manager with valid authentication can access detailed
 * information about a specific job role under an organizational job
 * series.
 *
 * This scenario performs the full preparatory workflow including:
 *
 * 1. Manager account creation
 * 2. Creation of a job group (the highest organizational classification)
 * 3. Creation of a job series under the job group
 * 4. Creation of a job role under the job series
 * 5. Retrieval of the job role details by its ID
 *
 * Each step is carefully validated using typia.assert to confirm response
 * type safety.
 *
 * The test ensures the manager role can properly authenticate and that the
 * job role details endpoint functions correctly with proper authorization
 * and returns the expected structured response.
 */
export async function test_api_job_performance_eval_job_role_detail_accessible_to_manager_with_valid_authentication(
  connection: api.IConnection,
) {
  // 1. Create a manager account with valid information
  const managerEmail = `${RandomGenerator.alphabets(4)}@example.com`;
  const managerCreateBody = {
    email: managerEmail,
    password: "ValidPassword123!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(manager);

  // 2. Create a job group
  const jobGroupCreateBody = {
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: `Group-${RandomGenerator.name(2)}`,
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

  // 3. Prepare UUID for job group id since jobGroup has no id property
  const jobGroupId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create a job series linked to the job group
  const jobSeriesCreateBody = {
    job_group_id: jobGroupId,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: `Series-${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 5. Create a job role under the job series
  const jobRoleCreateBody = {
    job_series_id: jobSeries.id,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: `Role-${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 6. Retrieve the job role details by its ID
  const jobRoleDetail: IJobPerformanceEvalJobRole =
    await api.functional.jobPerformanceEval.manager.jobSeries.jobRoles.at(
      connection,
      {
        jobSeriesId: jobRole.job_series_id,
        jobRoleId: jobRole.id,
      },
    );
  typia.assert(jobRoleDetail);

  // Validate that the retrieved details match the created job role
  TestValidator.equals("job role id matches", jobRoleDetail.id, jobRole.id);

  TestValidator.equals(
    "job role job_series_id matches",
    jobRoleDetail.job_series_id,
    jobRole.job_series_id,
  );

  TestValidator.equals(
    "job role code matches",
    jobRoleDetail.code,
    jobRole.code,
  );

  TestValidator.equals(
    "job role name matches",
    jobRoleDetail.name,
    jobRole.name,
  );
}
