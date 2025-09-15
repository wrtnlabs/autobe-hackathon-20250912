import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerEvaluation";

/**
 * This E2E test validates the successful creation of a manager evaluation
 * within a realistic business workflow.
 *
 * First, a manager user is created by calling the manager join API,
 * providing email, password, and name according to the DTO requirements.
 * Then an employee user is created similarly using the employee join API.
 * Afterwards, an evaluation cycle is created using the manager evaluation
 * cycle creation API, specifying the unique cycle code, name, start and end
 * date, and active status. Finally, the manager evaluation creation API is
 * called with a valid payload linking the manager_id, employee_id,
 * evaluation_cycle_id, evaluation_date, and numeric scores for
 * work_performance_score, knowledge_skill_score,
 * problem_solving_collab_score, and innovation_score all between 1 and 5 as
 * required, plus a comprehensive overall_comment string. All API responses
 * are asserted with typia.assert to ensure type safety. TestValidator is
 * used to verify key ID fields are correctly linked and that the returned
 * evaluation record matches the submitted data in terms of IDs and score
 * values, thereby verifying the core business logic and authorization
 * flows.
 *
 * The test implements full authentication context switching implicitly
 * through the SDK join calls as described. Timestamp fields in responses
 * are asserted but not tested further, trusting typia validations. All
 * required properties are included with correct types and formats (UUIDs,
 * ISO 8601 date-times, email strings). The test sequence respects the
 * business domain requirements and API contract, emphasizing proper
 * role-based operations (manager creating evaluation for employee in a
 * valid cycle).
 *
 * Stepwise process:
 *
 * 1. Create a manager user via `auth/manager/join` endpoint.
 * 2. Create an employee user via `auth/employee/join` endpoint.
 * 3. Create an evaluation cycle via
 *    `jobPerformanceEval/manager/evaluationCycles` with unique code and
 *    date range.
 * 4. Create a manager evaluation via
 *    `jobPerformanceEval/manager/managerEvaluations` using all required IDs
 *    and valid score values with a meaningful overall comment.
 * 5. Validate all returned data with strict type safety and cross-field
 *    equality checks.
 *
 * This ensures the system correctly handles manager evaluation creation
 * under authorized contexts with valid linked entities and proper score
 * ranges.
 */
export async function test_api_managerevaluation_create_success(
  connection: api.IConnection,
) {
  // 1. Create manager user
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const manager = await api.functional.auth.manager.join(connection, {
    body: {
      email: managerEmail,
      password: "Password123!",
      name: RandomGenerator.name(),
    } satisfies IJobPerformanceEvalManager.ICreate,
  });
  typia.assert(manager);

  // 2. Create employee user
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employee = await api.functional.auth.employee.join.joinEmployee(
    connection,
    {
      body: {
        email: employeeEmail,
        password_hash: "hashed-pw-sample",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    },
  );
  typia.assert(employee);

  // 3. Create evaluation cycle
  const now = new Date();
  const startDate = now.toISOString();
  const endDate = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();
  // generate unique code for cycle
  const cycleCode = `CYCLE-${Date.now()}`;

  const evaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      {
        body: {
          cycle_code: cycleCode,
          cycle_name: `${cycleCode} Name`,
          start_date: startDate,
          end_date: endDate,
          is_active: true,
        } satisfies IJobPerformanceEvalEvaluationCycle.ICreate,
      },
    );
  typia.assert(evaluationCycle);

  // 4. Create manager evaluation
  const evaluationDate = new Date().toISOString();

  const managerEvaluationPayload = {
    manager_id: manager.id,
    employee_id: employee.id,
    evaluation_cycle_id: evaluationCycle.id,
    evaluation_date: evaluationDate,
    work_performance_score: 4,
    knowledge_skill_score: 5,
    problem_solving_collab_score: 3,
    innovation_score: 4,
    overall_comment: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IJobPerformanceEvalManagerEvaluation.ICreate;

  const createdEvaluation =
    await api.functional.jobPerformanceEval.manager.managerEvaluations.create(
      connection,
      {
        body: managerEvaluationPayload,
      },
    );
  typia.assert(createdEvaluation);

  // 5. Validation checks
  TestValidator.equals(
    "manager ID matches",
    createdEvaluation.manager_id,
    manager.id,
  );
  TestValidator.equals(
    "employee ID matches",
    createdEvaluation.employee_id,
    employee.id,
  );
  TestValidator.equals(
    "evaluation cycle ID matches",
    createdEvaluation.evaluation_cycle_id,
    evaluationCycle.id,
  );
  TestValidator.equals(
    "work performance score matches",
    createdEvaluation.work_performance_score,
    managerEvaluationPayload.work_performance_score,
  );
  TestValidator.equals(
    "knowledge skill score matches",
    createdEvaluation.knowledge_skill_score,
    managerEvaluationPayload.knowledge_skill_score,
  );
  TestValidator.equals(
    "problem solving collaboration score matches",
    createdEvaluation.problem_solving_collab_score,
    managerEvaluationPayload.problem_solving_collab_score,
  );
  TestValidator.equals(
    "innovation score matches",
    createdEvaluation.innovation_score,
    managerEvaluationPayload.innovation_score,
  );
  TestValidator.equals(
    "overall comment matches",
    createdEvaluation.overall_comment,
    managerEvaluationPayload.overall_comment,
  );
  TestValidator.predicate(
    "evaluation created_at is ISO date",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
      createdEvaluation.created_at,
    ),
  );
  TestValidator.predicate(
    "evaluation updated_at is ISO date",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
      createdEvaluation.updated_at,
    ),
  );
}
