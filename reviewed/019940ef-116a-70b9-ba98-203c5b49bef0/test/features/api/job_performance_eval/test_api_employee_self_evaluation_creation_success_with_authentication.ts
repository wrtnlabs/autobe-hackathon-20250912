import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";

/**
 * Test creating a new self-evaluation record as an authenticated employee
 * user.
 *
 * This test performs the following steps:
 *
 * 1. Register a new employee user by calling '/auth/employee/join' with a
 *    valid email, password hash, and name. The authentication tokens are
 *    automatically managed by the SDK allowing subsequent API calls.
 * 2. Using the authenticated context, create a new self-evaluation for the
 *    employee by posting to '/jobPerformanceEval/employee/selfEvaluations'.
 *    The self-evaluation includes required fields:
 *
 *    - Evaluation_cycle_id (random UUID)
 *    - Evaluation_date (current date-time in ISO 8601 format)
 *    - Work_performance_score, knowledge_skill_score,
 *         problem_solving_collab_score, innovation_score (each 1 to 5,
 *         random integer)
 *    - Overall_comment (a realistic random string comment)
 * 3. Verify that the self-evaluation creation succeeded
 * 4. Validate the returned record's properties match the input data
 * 5. Use typia.assert to ensure the response fully complies with the
 *    IJobPerformanceEvalSelfEvaluation type
 *
 * This test ensures the entire self-evaluation creation workflow works
 * correctly under authenticated employee user context and strictly adheres
 * to data constraints and formats.
 */
export async function test_api_employee_self_evaluation_creation_success_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new employee user
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64); // Simulate a hashed password
  const name = RandomGenerator.name();

  const employee: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: {
        email,
        password_hash: passwordHash,
        name,
      } satisfies IJobPerformanceEvalEmployee.ICreate,
    });
  typia.assert(employee);

  // 2. Create a new self-evaluation with all required fields
  const evaluationCycleId = typia.random<string & tags.Format<"uuid">>();
  const nowIso = new Date().toISOString();

  // Generate random scores between 1 and 5
  function randomScore(): number & tags.Type<"int32"> {
    const score = Math.floor(Math.random() * 5) + 1;
    return score satisfies number as number;
  }

  const selfEvaluationCreate = {
    evaluation_cycle_id: evaluationCycleId,
    evaluation_date: nowIso,
    work_performance_score: randomScore(),
    knowledge_skill_score: randomScore(),
    problem_solving_collab_score: randomScore(),
    innovation_score: randomScore(),
    overall_comment: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IJobPerformanceEvalSelfEvaluation.ICreate;

  const selfEvaluation: IJobPerformanceEvalSelfEvaluation =
    await api.functional.jobPerformanceEval.employee.selfEvaluations.create(
      connection,
      {
        body: selfEvaluationCreate,
      },
    );
  typia.assert(selfEvaluation);

  // 3. Validate returned data fields
  TestValidator.equals(
    "evaluation_cycle_id matches",
    selfEvaluation.evaluation_cycle_id,
    selfEvaluationCreate.evaluation_cycle_id,
  );
  TestValidator.equals(
    "evaluation_date matches",
    selfEvaluation.evaluation_date,
    selfEvaluationCreate.evaluation_date,
  );
  TestValidator.equals(
    "work_performance_score matches",
    selfEvaluation.work_performance_score,
    selfEvaluationCreate.work_performance_score,
  );
  TestValidator.equals(
    "knowledge_skill_score matches",
    selfEvaluation.knowledge_skill_score,
    selfEvaluationCreate.knowledge_skill_score,
  );
  TestValidator.equals(
    "problem_solving_collab_score matches",
    selfEvaluation.problem_solving_collab_score,
    selfEvaluationCreate.problem_solving_collab_score,
  );
  TestValidator.equals(
    "innovation_score matches",
    selfEvaluation.innovation_score,
    selfEvaluationCreate.innovation_score,
  );
  TestValidator.equals(
    "overall_comment matches",
    selfEvaluation.overall_comment,
    selfEvaluationCreate.overall_comment,
  );
}
