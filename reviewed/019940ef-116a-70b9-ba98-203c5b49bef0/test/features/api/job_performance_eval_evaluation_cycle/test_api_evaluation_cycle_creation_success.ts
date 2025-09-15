import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

export async function test_api_evaluation_cycle_creation_success(
  connection: api.IConnection,
) {
  // 1. Manager user joins with valid credentials
  const managerCreateBody = {
    email: `manager.${RandomGenerator.alphaNumeric(6)}@company.com`,
    password: "StrongPass123!",
    name: RandomGenerator.name(2),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const managerAuth: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(managerAuth);

  // 2. Create an evaluation cycle with valid, meaningful data
  const now = new Date();
  const startDate = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 1 day in future
  const endDate = new Date(startDate.getTime() + 1000 * 60 * 60 * 24 * 30); // +30 days

  const evaluationCycleCreateBody = {
    cycle_code: `EVALCYCLE-${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
    cycle_name: `FY2025 Q3 Performance Review`,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    is_active: true,
  } satisfies IJobPerformanceEvalEvaluationCycle.ICreate;

  const evaluationCycle: IJobPerformanceEvalEvaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      {
        body: evaluationCycleCreateBody,
      },
    );
  typia.assert(evaluationCycle);

  // 3. Validate the returned data matches input and system fields
  TestValidator.equals(
    "cycle_code matches",
    evaluationCycle.cycle_code,
    evaluationCycleCreateBody.cycle_code,
  );
  TestValidator.equals(
    "cycle_name matches",
    evaluationCycle.cycle_name,
    evaluationCycleCreateBody.cycle_name,
  );
  TestValidator.equals(
    "start_date matches",
    evaluationCycle.start_date,
    evaluationCycleCreateBody.start_date,
  );
  TestValidator.equals(
    "end_date matches",
    evaluationCycle.end_date,
    evaluationCycleCreateBody.end_date,
  );
  TestValidator.equals(
    "is_active flag matches",
    evaluationCycle.is_active,
    evaluationCycleCreateBody.is_active,
  );

  // The created_at and updated_at are ISO formatted strings, check format superficially
  TestValidator.predicate(
    "created_at is ISO date-time string",
    typeof evaluationCycle.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(evaluationCycle.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time string",
    typeof evaluationCycle.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(evaluationCycle.updated_at),
  );

  // deleted_at must be null explicitly
  TestValidator.equals("deleted_at is null", evaluationCycle.deleted_at, null);
}
