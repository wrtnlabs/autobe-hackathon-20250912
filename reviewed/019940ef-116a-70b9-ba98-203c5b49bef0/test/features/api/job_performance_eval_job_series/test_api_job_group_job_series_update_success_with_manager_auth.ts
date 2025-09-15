import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import type { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

export async function test_api_job_group_job_series_update_success_with_manager_auth(
  connection: api.IConnection,
) {
  // 1. Create a manager user (join)
  const managerCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@company.com",
    password: "P@ssw0rd1234",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(manager);

  // 2. Create a job group using manager authentication
  const jobGroupCreateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
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

  // 3. Prepare a jobGroupId for job series creation as a UUID string
  const jobGroupId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Create a job series under a job group with jobGroupId
  const jobSeriesCreateBody = {
    job_group_id: jobGroupId,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
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

  // 5. Update the job series with new data
  const jobSeriesUpdateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IJobPerformanceEvalJobSeries.IUpdate;

  const updatedJobSeries: IJobPerformanceEvalJobSeries =
    await api.functional.jobPerformanceEval.manager.jobGroups.jobSeries.update(
      connection,
      {
        jobGroupId: jobGroupId,
        jobSeriesId: jobSeries.id,
        body: jobSeriesUpdateBody,
      },
    );
  typia.assert(updatedJobSeries);

  // Validations
  TestValidator.equals(
    "job series id unchanged",
    updatedJobSeries.id,
    jobSeries.id,
  );
  TestValidator.equals(
    "job series job_group_id",
    updatedJobSeries.job_group_id,
    jobGroupId,
  );
  TestValidator.equals(
    "job series code updated",
    updatedJobSeries.code,
    jobSeriesUpdateBody.code,
  );
  TestValidator.equals(
    "job series name updated",
    updatedJobSeries.name,
    jobSeriesUpdateBody.name,
  );
  TestValidator.equals(
    "job series description updated",
    updatedJobSeries.description,
    jobSeriesUpdateBody.description ?? null,
  );
}
