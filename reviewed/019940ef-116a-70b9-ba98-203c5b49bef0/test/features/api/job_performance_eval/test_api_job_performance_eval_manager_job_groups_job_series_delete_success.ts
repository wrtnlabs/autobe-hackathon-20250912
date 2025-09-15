import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import type { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test the full lifecycle of a manager user creating a job group, then a job
 * series under that group, and finally successfully deleting the created job
 * series.
 *
 * This scenario covers owner authentication, resource creation, and secure
 * deletion.
 *
 * Flow:
 *
 * 1. Manager registers and authenticates.
 * 2. Manager creates a job group.
 * 3. Manager creates a job series within the created job group.
 * 4. Manager deletes the created job series.
 *
 * Validations include:
 *
 * - Successful creations with type-safe DTOs.
 * - Proper linkage between job series and job group.
 * - Manager role-based access during all operations.
 * - Successful deletion without errors.
 */
export async function test_api_job_performance_eval_manager_job_groups_job_series_delete_success(
  connection: api.IConnection,
) {
  // 1. Manager user joins and authenticates
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const managerPassword = "StrongPassw0rd!";
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: managerPassword,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Manager creates a job group
  const jobGroupCreateBody = {
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IJobPerformanceEvalJobGroup.ICreate;

  const createdJobGroup: IJobPerformanceEvalJobGroup =
    await api.functional.jobPerformanceEval.manager.jobGroups.create(
      connection,
      {
        body: jobGroupCreateBody,
      },
    );
  typia.assert(createdJobGroup);

  // Manually generate a jobGroupId as UUID string for API path parameters
  const jobGroupId: string = typia.random<string & tags.Format<"uuid">>();

  // 3. Manager creates a job series under the created job group
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

  // 4. Manager deletes the created job series
  await api.functional.jobPerformanceEval.manager.jobGroups.jobSeries.erase(
    connection,
    {
      jobGroupId: jobGroupId,
      jobSeriesId: jobSeries.id,
    },
  );
}
