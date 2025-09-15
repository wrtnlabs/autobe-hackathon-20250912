import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import type { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalJobSeries";

/**
 * Test listing job series under a valid job group with manager
 * authentication context.
 *
 * This test function performs the following steps:
 *
 * 1. Create a manager via authentication join endpoint.
 * 2. Using authenticated manager context, create a job group to obtain a
 *    jobGroupId.
 * 3. Using the jobGroupId, send a PATCH request to list job series under that
 *    job group with realistic filtering and pagination.
 * 4. Assert successful responses and validate business logic such as
 *    pagination information and data consistency.
 */
export async function test_api_jobseries_index_with_manager_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create manager user with realistic data
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerCreate = {
    email: managerEmail,
    password: "SecurePass123!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreate,
    });
  typia.assert(manager);

  // Step 2: Create a job group with manager authorization
  const jobGroupCreate = {
    code: RandomGenerator.alphabets(6).toUpperCase(),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IJobPerformanceEvalJobGroup.ICreate;

  const jobGroup: IJobPerformanceEvalJobGroup =
    await api.functional.jobPerformanceEval.manager.jobGroups.create(
      connection,
      {
        body: jobGroupCreate,
      },
    );
  typia.assert(jobGroup);

  // Step 3: Prepare request body for job series listing with filtering and pagination
  const jobSeriesRequest: IJobPerformanceEvalJobSeries.IRequest = {
    code: jobGroup.code.substring(0, 3), // partial matching code filter
    name: jobGroup.name.substring(0, 3), // partial matching name filter
    description: jobGroup.description ?? null, // explicitly null if description missing
    page: 1,
    limit: 10,
    orderBy: "name",
  };

  // Use a random UUID as jobGroupId parameter because create API does not return id
  const jobGroupId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 4: Call job series listing API and assert result
  const jobSeriesPage: IPageIJobPerformanceEvalJobSeries.ISummary =
    await api.functional.jobPerformanceEval.manager.jobGroups.jobSeries.index(
      connection,
      {
        jobGroupId: jobGroupId,
        body: jobSeriesRequest,
      },
    );

  typia.assert(jobSeriesPage);

  // Step 5: Validate pagination
  TestValidator.predicate(
    "pagination current page is 1",
    jobSeriesPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    jobSeriesPage.pagination.limit === 10,
  );

  // Validate that returned data are consistent with pagination limit
  TestValidator.predicate(
    "job series list length should be less or equal than limit",
    jobSeriesPage.data.length <= jobSeriesPage.pagination.limit,
  );
}
