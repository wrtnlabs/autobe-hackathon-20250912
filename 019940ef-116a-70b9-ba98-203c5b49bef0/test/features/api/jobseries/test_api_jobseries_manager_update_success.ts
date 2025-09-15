import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test update of an existing job series by an authenticated manager.
 *
 * This test function implements the scenario where three manager users are
 * created and authenticated to fulfill dependency requirements. It then
 * simulates creation of a job group and a job series by generating UUIDs to
 * represent these entities. The update operation is performed on the job
 * series with new values for code, name, and description. The test asserts
 * that the returned job series matches the updated values exactly.
 *
 * All API calls are awaited and verified with typia.assert to ensure type
 * safety and schema compliance.
 *
 * Steps:
 *
 * 1. Create three manager users using the join endpoint for authentication
 *    context.
 * 2. Simulate a job group by generating a UUID.
 * 3. Simulate a job series creation by generating a UUID.
 * 4. Update the job series with new code, name, and description values.
 * 5. Assert the update result matches the input data.
 */
export async function test_api_jobseries_manager_update_success(
  connection: api.IConnection,
) {
  // 1. Create three manager users to satisfy dependencies
  const manager1Email: string = typia.random<string & tags.Format<"email">>();
  const manager1: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: manager1Email,
        password: "Password123!",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager1);

  const manager2Email: string = typia.random<string & tags.Format<"email">>();
  const manager2: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: manager2Email,
        password: "Password123!",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager2);

  const manager3Email: string = typia.random<string & tags.Format<"email">>();
  const manager3: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: manager3Email,
        password: "Password123!",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager3);

  // 2. Simulate job group creation
  const jobGroupId: string = typia.random<string & tags.Format<"uuid">>();

  // 3. Simulate existing job series
  const jobSeriesId: string = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare update payload
  const updateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IJobPerformanceEvalJobSeries.IUpdate;

  // 5. Execute update operation
  const updatedJobSeries: IJobPerformanceEvalJobSeries =
    await api.functional.jobPerformanceEval.manager.jobGroups.jobSeries.update(
      connection,
      {
        jobGroupId: jobGroupId,
        jobSeriesId: jobSeriesId,
        body: updateBody,
      },
    );
  typia.assert(updatedJobSeries);

  // 6. Validate updated fields
  TestValidator.equals(
    "updated job series code equals request",
    updatedJobSeries.code,
    updateBody.code,
  );
  TestValidator.equals(
    "updated job series name equals request",
    updatedJobSeries.name,
    updateBody.name,
  );
  if (updateBody.description === null || updateBody.description === undefined) {
    TestValidator.equals(
      "updated job series description equals request",
      updatedJobSeries.description,
      null,
    );
  } else {
    TestValidator.equals(
      "updated job series description equals request",
      updatedJobSeries.description,
      updateBody.description,
    );
  }
}
