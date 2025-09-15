import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Validate unauthorized update failure for job series.
 *
 * This test ensures that attempts to update a job series without
 * authenticating as a manager result in authorization failure. It first
 * invokes the manager join operation to establish system state but
 * deliberately does not authenticate the connection before attempting the
 * update.
 *
 * The test asserts that the API rejects the update due to missing or
 * insufficient authentication and role-based access control enforcement.
 */
export async function test_api_job_group_job_series_update_unauthorized_failure(
  connection: api.IConnection,
) {
  // 1. Manager joins (required prerequisite, authenticates connection)
  const managerCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  // Perform join and assert successful authentication
  const managerAuthorized = await api.functional.auth.manager.join(connection, {
    body: managerCreateBody,
  });
  typia.assert(managerAuthorized);

  // Use separate connection without authentication to simulate unauthorized
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Prepare data to update job series
  const jobGroupId = typia.random<string & tags.Format<"uuid">>();
  const jobSeriesId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IJobPerformanceEvalJobSeries.IUpdate;

  // Attempt update without authentication: expect error
  await TestValidator.error(
    "unauthenticated user cannot update job series",
    async () => {
      await api.functional.jobPerformanceEval.manager.jobGroups.jobSeries.update(
        unauthConnection,
        {
          jobGroupId,
          jobSeriesId,
          body: updateBody,
        },
      );
    },
  );
}
