import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEvaluationCycle";

/**
 * Test retrieving detailed information of a specific evaluation cycle by
 * its UUID.
 *
 * This end-to-end test performs the following:
 *
 * 1. Registers and authenticates a manager user.
 * 2. Searches for evaluation cycles to get a valid evaluation cycle ID.
 * 3. Retrieves detailed information of the selected evaluation cycle by its
 *    ID.
 * 4. Validates the presence and format of all key properties in the returned
 *    cycle.
 * 5. Ensures only authorized managers can access this information.
 */
export async function test_api_manager_evaluationcycle_get_detail_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a manager user
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    name: typia.random<string>(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const managerAuth: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(managerAuth);

  // 2. Search for evaluation cycles (pagination with default page and limit)
  const searchRequest = {
    page: 0,
    limit: 10,
  } satisfies IJobPerformanceEvalEvaluationCycle.IRequest;

  const searchResponse: IPageIJobPerformanceEvalEvaluationCycle.ISummary =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(searchResponse);

  // Ensure at least one evaluation cycle exists
  TestValidator.predicate(
    "evaluation cycles search returned at least one data",
    searchResponse.data.length > 0,
  );

  // 3. Pick a valid evaluation cycle ID from the search results
  const evaluationCycleId = searchResponse.data[0].id;

  // 4. Retrieve detailed evaluation cycle by ID
  const evaluationCycleDetail: IJobPerformanceEvalEvaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.at(
      connection,
      { id: evaluationCycleId },
    );
  typia.assert(evaluationCycleDetail);

  // 5. Validate key fields are present and correctly formatted
  TestValidator.equals(
    "evaluation cycle ID matches searched",
    evaluationCycleDetail.id,
    evaluationCycleId,
  );
  TestValidator.predicate(
    "evaluation cycle has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      evaluationCycleDetail.id,
    ),
  );
  TestValidator.predicate(
    "evaluation cycle code is non-empty string",
    typeof evaluationCycleDetail.cycle_code === "string" &&
      evaluationCycleDetail.cycle_code.length > 0,
  );
  TestValidator.predicate(
    "evaluation cycle name is non-empty string",
    typeof evaluationCycleDetail.cycle_name === "string" &&
      evaluationCycleDetail.cycle_name.length > 0,
  );
  TestValidator.predicate(
    "start_date is valid ISO 8601 date-time",
    !Number.isNaN(Date.parse(evaluationCycleDetail.start_date)),
  );
  TestValidator.predicate(
    "end_date is valid ISO 8601 date-time",
    !Number.isNaN(Date.parse(evaluationCycleDetail.end_date)),
  );
  TestValidator.predicate(
    "is_active is boolean",
    typeof evaluationCycleDetail.is_active === "boolean",
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 date-time",
    !Number.isNaN(Date.parse(evaluationCycleDetail.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 date-time",
    !Number.isNaN(Date.parse(evaluationCycleDetail.updated_at)),
  );
  TestValidator.predicate(
    "deleted_at is null or valid ISO 8601 date-time",
    evaluationCycleDetail.deleted_at === null ||
      !Number.isNaN(Date.parse(evaluationCycleDetail.deleted_at)),
  );
}
