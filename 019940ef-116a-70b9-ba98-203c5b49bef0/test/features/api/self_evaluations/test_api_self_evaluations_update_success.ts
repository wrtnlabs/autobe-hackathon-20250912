import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import type { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";

export async function test_api_self_evaluations_update_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate employee user
  const employeePlainPassword = RandomGenerator.alphaNumeric(12);
  const employeeCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: employeePlainPassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalEmployee.ICreate;

  const employeeAuthorized: IJobPerformanceEvalEmployee.IAuthorized =
    await api.functional.auth.employee.join.joinEmployee(connection, {
      body: employeeCreateBody,
    });
  typia.assert(employeeAuthorized);

  // 2. Create and authenticate manager user
  const managerPlainPassword = RandomGenerator.alphaNumeric(12);
  const managerCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password: managerPlainPassword,
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const managerAuthorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(managerAuthorized);

  // 3. Manager logs in
  await api.functional.auth.manager.login(connection, {
    body: {
      email: managerCreateBody.email,
      password: managerPlainPassword,
    } satisfies IJobPerformanceEvalManager.ILogin,
  });

  // 4. Manager creates evaluation cycle
  const evalCycleCreateBody = {
    cycle_code: `CYCLE-${Date.now()}`,
    cycle_name: `Performance Cycle ${new Date().getFullYear()}`,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
  } satisfies IJobPerformanceEvalEvaluationCycle.ICreate;

  const createdEvalCycle: IJobPerformanceEvalEvaluationCycle =
    await api.functional.jobPerformanceEval.manager.evaluationCycles.create(
      connection,
      { body: evalCycleCreateBody },
    );
  typia.assert(createdEvalCycle);

  // 5. Employee logs in
  await api.functional.auth.employee.login.loginEmployee(connection, {
    body: {
      email: employeeCreateBody.email,
      password: employeePlainPassword,
    } satisfies IJobPerformanceEvalEmployee.ILogin,
  });

  // 6. Employee creates self-evaluation record
  const selfEvalCreateBody = {
    evaluation_cycle_id: createdEvalCycle.id,
    evaluation_date: new Date().toISOString(),
    work_performance_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    knowledge_skill_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    problem_solving_collab_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    innovation_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    overall_comment: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IJobPerformanceEvalSelfEvaluation.ICreate;

  const createdSelfEval: IJobPerformanceEvalSelfEvaluation =
    await api.functional.jobPerformanceEval.employee.selfEvaluations.create(
      connection,
      { body: selfEvalCreateBody },
    );
  typia.assert(createdSelfEval);

  // 7. Employee updates the self-evaluation record
  const selfEvalUpdateBody = {
    evaluation_date: new Date().toISOString(),
    work_performance_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    knowledge_skill_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    problem_solving_collab_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    innovation_score: RandomGenerator.pick([1, 2, 3, 4, 5]),
    overall_comment: RandomGenerator.paragraph({ sentences: 7 }),
  } satisfies IJobPerformanceEvalSelfEvaluation.IUpdate;

  const updatedSelfEval: IJobPerformanceEvalSelfEvaluation =
    await api.functional.jobPerformanceEval.employee.selfEvaluations.update(
      connection,
      {
        id: createdSelfEval.id,
        body: selfEvalUpdateBody,
      },
    );
  typia.assert(updatedSelfEval);

  // 8. Validate that updated data matches
  TestValidator.equals(
    "updated evaluation id matches",
    updatedSelfEval.id,
    createdSelfEval.id,
  );
  TestValidator.equals(
    "updated evaluation overall comment matches",
    updatedSelfEval.overall_comment,
    selfEvalUpdateBody.overall_comment ?? updatedSelfEval.overall_comment,
  );
  TestValidator.equals(
    "updated evaluation work_performance_score matches",
    updatedSelfEval.work_performance_score,
    selfEvalUpdateBody.work_performance_score ??
      updatedSelfEval.work_performance_score,
  );
  TestValidator.equals(
    "updated evaluation knowledge_skill_score matches",
    updatedSelfEval.knowledge_skill_score,
    selfEvalUpdateBody.knowledge_skill_score ??
      updatedSelfEval.knowledge_skill_score,
  );
  TestValidator.equals(
    "updated evaluation problem_solving_collab_score matches",
    updatedSelfEval.problem_solving_collab_score,
    selfEvalUpdateBody.problem_solving_collab_score ??
      updatedSelfEval.problem_solving_collab_score,
  );
  TestValidator.equals(
    "updated evaluation innovation_score matches",
    updatedSelfEval.innovation_score,
    selfEvalUpdateBody.innovation_score ?? updatedSelfEval.innovation_score,
  );
}
