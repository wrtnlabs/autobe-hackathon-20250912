import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import type { IJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationScore";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerEvaluation";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEvaluationScore";

/**
 * Test searching job performance evaluation scores by employee role.
 *
 * This test covers full lifecycle setup including:
 *
 * - Employee and Manager user registration and login
 * - Creating evaluation cycles
 * - Creating manager evaluations for employees
 * - Creating multiple evaluation scores associated with manager evaluations
 * - Searching evaluation scores with varied filters, sorting, and pagination
 *
 * It validates data correctness, pagination metadata, sorting order, and
 * filtering criteria, asserting that responses match requested conditions.
 */
export async function test_api_evaluationscores_search_success(
  connection: api.IConnection,
) {
  // 1. Employee user joins
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeCreateBody = {
    email: `employee${typia.random<string & tags.Format<"uuid">>().substring(0, 8)}@example.com`,
    password_hash: employeePassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;
  const employeeAuth = await api.functional.auth.employee.join.joinEmployee(
    connection,
    { body: employeeCreateBody },
  );
  typia.assert(employeeAuth);

  // 2. Manager user joins
  const managerPassword = RandomGenerator.alphaNumeric(16);
  const managerCreateBody = {
    email: `manager${typia.random<string & tags.Format<"uuid">>().substring(0, 8)}@example.com`,
    password: managerPassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const managerAuth = await api.functional.auth.manager.join(connection, {
    body: managerCreateBody,
  });
  typia.assert(managerAuth);

  // 3. Manager logs in
  const managerLoginBody = {
    email: managerCreateBody.email,
    password: managerPassword,
  } satisfies IJobPerformanceEvalManager.ILogin;
  const managerLogin = await api.functional.auth.manager.login(connection, {
    body: managerLoginBody,
  });
  typia.assert(managerLogin);

  // 4. Manager creates an evaluation cycle
  const cycleCreateBody = {
    cycle_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    cycle_name: RandomGenerator.paragraph({ sentences: 3 }),
    start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
    end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days later
    is_active: true,
  } satisfies IJobPerformanceEvalEvaluationCycle.ICreate;
  const evaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      { body: cycleCreateBody },
    );
  typia.assert(evaluationCycle);

  // 5. Manager creates a manager evaluation for the employee
  const mgrEvalCreateBody = {
    manager_id: managerAuth.id,
    employee_id: employeeAuth.id,
    evaluation_cycle_id: evaluationCycle.id,
    evaluation_date: new Date().toISOString(),
    work_performance_score: 4,
    knowledge_skill_score: 5,
    problem_solving_collab_score: 4,
    innovation_score: 3,
    overall_comment: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IJobPerformanceEvalManagerEvaluation.ICreate;
  const managerEvaluation =
    await api.functional.jobPerformanceEval.manager.managerEvaluations.create(
      connection,
      { body: mgrEvalCreateBody },
    );
  typia.assert(managerEvaluation);

  // 6. Create multiple evaluation scores associated with the manager evaluation
  const categories = [
    "work_performance",
    "knowledge_skill",
    "problem_solving_collab",
    "innovation",
  ] as const;

  const scoresToCreate = categories.map((category, i) => {
    return {
      evaluation_id: managerEvaluation.id,
      category,
      score: 3 + (i % 3),
    } satisfies IJobPerformanceEvalEvaluationScore.ICreate;
  });

  const createdScores = [] as IJobPerformanceEvalEvaluationScore[];
  for (const scoreBody of scoresToCreate) {
    const created =
      await api.functional.jobPerformanceEval.employee.evaluationScores.create(
        connection,
        { body: scoreBody },
      );
    typia.assert(created);
    createdScores.push(created);
  }

  // 7. Login as employee to establish authentication context
  const loginEmployeeBody = {
    email: employeeCreateBody.email,
    password: employeePassword,
  } satisfies IJobPerformanceEvalEmployee.ILogin;
  const employeeLogin = await api.functional.auth.employee.login.loginEmployee(
    connection,
    { body: loginEmployeeBody },
  );
  typia.assert(employeeLogin);

  // 8. Search evaluation scores with no filters (default pagination)
  const searchNoFiltersBody =
    {} satisfies IJobPerformanceEvalEvaluationScore.IRequest;
  const page1 =
    await api.functional.jobPerformanceEval.employee.evaluationScores.index(
      connection,
      { body: searchNoFiltersBody },
    );
  typia.assert(page1);

  // Validate pagination metadata and response
  TestValidator.predicate(
    "pagination current page is at least 1",
    page1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    page1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count matches data length",
    page1.pagination.records >= page1.data.length,
  );
  TestValidator.predicate(
    "pagination pages count at least 1",
    page1.pagination.pages >= 1,
  );

  // 9. Search filtered by evaluation_id
  const filterByEvalIdBody = {
    evaluation_id: managerEvaluation.id,
  } satisfies IJobPerformanceEvalEvaluationScore.IRequest;
  const filteredByEvalIdPage =
    await api.functional.jobPerformanceEval.employee.evaluationScores.index(
      connection,
      { body: filterByEvalIdBody },
    );
  typia.assert(filteredByEvalIdPage);
  for (const score of filteredByEvalIdPage.data) {
    TestValidator.equals(
      "score belongs to filtered evaluation",
      score.evaluation_id,
      managerEvaluation.id,
    );
  }

  // 10. Search filtered by category ascending
  const categoriesAsc = categories.slice();
  const filterByCategoryAscBody = {
    category: categoriesAsc[0],
    order_by: "category",
    order_direction: "asc",
  } satisfies IJobPerformanceEvalEvaluationScore.IRequest;
  const categoryAscPage =
    await api.functional.jobPerformanceEval.employee.evaluationScores.index(
      connection,
      { body: filterByCategoryAscBody },
    );
  typia.assert(categoryAscPage);
  // Assert all categories equals filter
  for (const score of categoryAscPage.data) {
    TestValidator.equals(
      "category equals filter",
      score.category,
      categoriesAsc[0],
    );
  }
  // Assert sorted ascending
  for (let i = 1; i < categoryAscPage.data.length; i++) {
    TestValidator.predicate(
      "category sorted ascending",
      categoryAscPage.data[i - 1].category <= categoryAscPage.data[i].category,
    );
  }

  // 11. Search filtered by category descending
  const categoriesDesc = categories.slice().reverse();
  const filterByCategoryDescBody = {
    category: categoriesDesc[0],
    order_by: "category",
    order_direction: "desc",
  } satisfies IJobPerformanceEvalEvaluationScore.IRequest;
  const categoryDescPage =
    await api.functional.jobPerformanceEval.employee.evaluationScores.index(
      connection,
      { body: filterByCategoryDescBody },
    );
  typia.assert(categoryDescPage);
  // Assert all categories equals filter
  for (const score of categoryDescPage.data) {
    TestValidator.equals(
      "category equals filter",
      score.category,
      categoriesDesc[0],
    );
  }
  // Assert sorted descending
  for (let i = 1; i < categoryDescPage.data.length; i++) {
    TestValidator.predicate(
      "category sorted descending",
      categoryDescPage.data[i - 1].category >=
        categoryDescPage.data[i].category,
    );
  }

  // 12. Search filtered by score range
  const filterByScoreRangeBody = {
    min_score: 3,
    max_score: 4,
  } satisfies IJobPerformanceEvalEvaluationScore.IRequest;
  const filteredByScoreRangePage =
    await api.functional.jobPerformanceEval.employee.evaluationScores.index(
      connection,
      { body: filterByScoreRangeBody },
    );
  typia.assert(filteredByScoreRangePage);
  for (const score of filteredByScoreRangePage.data) {
    TestValidator.predicate(
      "score within range",
      score.score >= 3 && score.score <= 4,
    );
  }

  // 13. Test pagination consistency by requesting page 2 (if more pages)
  if (page1.pagination.pages > 1) {
    const page2Body = {
      page: 2,
      limit: page1.pagination.limit,
    } satisfies IJobPerformanceEvalEvaluationScore.IRequest;
    const page2Result =
      await api.functional.jobPerformanceEval.employee.evaluationScores.index(
        connection,
        { body: page2Body },
      );
    typia.assert(page2Result);

    TestValidator.predicate("page 2 data exists", page2Result.data.length > 0);
    TestValidator.predicate(
      "page 2 current page number",
      page2Result.pagination.current === 2,
    );
  }

  // 14. Logout and test permission error (attempting search without auth)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot search evaluation scores",
    async () => {
      await api.functional.jobPerformanceEval.employee.evaluationScores.index(
        unauthConn,
        { body: {} },
      );
    },
  );
}
