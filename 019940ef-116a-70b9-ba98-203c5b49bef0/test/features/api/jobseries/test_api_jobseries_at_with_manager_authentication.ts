import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import type { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test retrieving job series details by ID with manager authentication context.
 *
 * This process accompanies creation of a manager user to establish an
 * authenticated session, creating a job group entity as a parent container,
 * followed by creation of a job series under the created job group. The test
 * completes by retrieving the job series by ID, asserting returned data matches
 * exactly with what was created.
 *
 * This test simulates a realistic manager user interaction workflow in the job
 * performance evaluation domain, ensuring secured data access and API
 * correctness.
 */
export async function test_api_jobseries_at_with_manager_authentication(
  connection: api.IConnection,
) {
  // 1. Create manager user and get authorized tokens
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(manager);

  // 2. Create job group
  const jobGroupCreateBody = {
    code: `JG${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IJobPerformanceEvalJobGroup.ICreate;
  const jobGroup: IJobPerformanceEvalJobGroup =
    await api.functional.jobPerformanceEval.manager.jobGroups.create(
      connection,
      { body: jobGroupCreateBody },
    );
  typia.assert(jobGroup);

  // 3. Create job series inside the job group
  const jobSeriesCreateBody = {
    job_group_id: jobGroup.code as string & tags.Format<"uuid">,
    code: `JS${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IJobPerformanceEvalJobSeries.ICreate;
  const jobSeries: IJobPerformanceEvalJobSeries =
    await api.functional.jobPerformanceEval.manager.jobGroups.jobSeries.create(
      connection,
      {
        jobGroupId: jobGroup.code as string & tags.Format<"uuid">,
        body: jobSeriesCreateBody,
      },
    );
  typia.assert(jobSeries);

  // 4. Retrieve the job series by ID and verify
  const jobSeriesRead: IJobPerformanceEvalJobSeries =
    await api.functional.jobPerformanceEval.manager.jobGroups.jobSeries.at(
      connection,
      {
        jobGroupId: jobGroup.code as string & tags.Format<"uuid">,
        jobSeriesId: jobSeries.id,
      },
    );
  typia.assert(jobSeriesRead);

  // 5. Validate retrieved job series matches created
  TestValidator.equals("job series id matches", jobSeriesRead.id, jobSeries.id);
  TestValidator.equals(
    "job series job_group_id matches",
    jobSeriesRead.job_group_id,
    jobGroup.code,
  );
  TestValidator.equals(
    "job series code matches",
    jobSeriesRead.code,
    jobSeriesCreateBody.code,
  );
  TestValidator.equals(
    "job series name matches",
    jobSeriesRead.name,
    jobSeriesCreateBody.name,
  );
  TestValidator.equals(
    "job series description matches",
    jobSeriesRead.description ?? null,
    jobSeriesCreateBody.description ?? null,
  );
}
