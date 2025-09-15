import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerEvaluation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalManagerEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalManagerEvaluation";

/**
 * Test searching paginated manager evaluations successfully.
 *
 * This test implements the full business context for managing performance
 * evaluation data.
 *
 * 1. Create a Manager user account by /auth/manager/join.
 * 2. Create an Employee user account by /auth/employee/join.
 * 3. Create a Evaluation Cycle under the authenticated Manager.
 * 4. Create a Manager Evaluation for the Employee in the evaluation cycle.
 * 5. Search for Manager Evaluations using filtered criteria with pagination.
 * 6. Validate the response contains the created Manager Evaluation with
 *    correct data.
 */
export async function test_api_manager_evaluations_search_success(
  connection: api.IConnection,
) {
  // 1. Manager user creation and authentication
  const managerEmail = `manager.${RandomGenerator.alphaNumeric(6)}@example.com`;
  const managerPassword = `pass!${RandomGenerator.alphaNumeric(10)}`;
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: managerPassword,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Employee user creation and authentication
  const employeeEmail = `employee.${RandomGenerator.alphaNumeric(6)}@example.com`;
  const employeePassword = `pass!${RandomGenerator.alphaNumeric(10)}`;
  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email: employeeEmail,
        password_hash: employeePassword,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employee);

  // 3. Create Evaluation Cycle
  const evaluationCycleBody = {
    cycle_code: `cycle_${RandomGenerator.alphaNumeric(8)}`,
    cycle_name: `Cycle ${RandomGenerator.alphaNumeric(4)}`,
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  } satisfies IJobPerformanceEvalEvaluationCycle.ICreate;

  const evaluationCycle: IJobPerformanceEvalEvaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      { body: evaluationCycleBody },
    );
  typia.assert(evaluationCycle);

  // 4. Create Manager Evaluation for Employee in that cycle
  const evaluationDate = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const managerEvaluationBody = {
    manager_id: manager.id,
    employee_id: employee.id,
    evaluation_cycle_id: evaluationCycle.id,
    evaluation_date: evaluationDate,
    work_performance_score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    knowledge_skill_score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    problem_solving_collab_score: RandomGenerator.pick([
      1, 2, 3, 4, 5,
    ] as const),
    innovation_score: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    overall_comment: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IJobPerformanceEvalManagerEvaluation.ICreate;

  const createdManagerEvaluation: IJobPerformanceEvalManagerEvaluation =
    await api.functional.jobPerformanceEval.manager.managerEvaluations.create(
      connection,
      { body: managerEvaluationBody },
    );
  typia.assert(createdManagerEvaluation);

  // 5. Search with filter and pagination
  const searchRequestBody = {
    employee_id: employee.id,
    evaluation_cycle_id: evaluationCycle.id,
    evaluation_date_from: new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    evaluation_date_to: new Date(Date.now()).toISOString(),
    page: 1,
    limit: 10,
    order_by: "evaluation_date",
    sort_direction: "desc",
  } satisfies IJobPerformanceEvalManagerEvaluation.IRequest;

  const searchResult: IPageIJobPerformanceEvalManagerEvaluation.ISummary =
    await api.functional.jobPerformanceEval.manager.managerEvaluations.index(
      connection,
      { body: searchRequestBody },
    );
  typia.assert(searchResult);

  // 6. Validate search results contain the created evaluation with matching id
  TestValidator.predicate(
    "search result data includes created manager evaluation",
    searchResult.data.some(
      (evaluation) => evaluation.id === createdManagerEvaluation.id,
    ),
  );
  TestValidator.equals(
    "pagination page number is as requested",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is as requested",
    searchResult.pagination.limit === 10,
  );
}
