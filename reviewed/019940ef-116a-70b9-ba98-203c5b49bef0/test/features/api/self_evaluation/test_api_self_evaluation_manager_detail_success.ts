import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";

export async function test_api_self_evaluation_manager_detail_success(
  connection: api.IConnection,
) {
  // Step 1: Manager user registration and authentication
  const managerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const managerAuthorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(managerAuthorized);

  // Step 2: Fetch self-evaluation detail by ID
  const selfEvaluationId = typia.random<string & tags.Format<"uuid">>();

  const selfEvaluation: IJobPerformanceEvalSelfEvaluation =
    await api.functional.jobPerformanceEval.manager.selfEvaluations.atSelfEvaluation(
      connection,
      {
        id: selfEvaluationId,
      },
    );
  typia.assert(selfEvaluation);

  // Validation checks
  TestValidator.predicate(
    "self-evaluation id has valid UUID format",
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      selfEvaluation.id,
    ),
  );
  TestValidator.equals(
    "self-evaluation id equals requested id",
    selfEvaluation.id,
    selfEvaluationId,
  );

  TestValidator.predicate(
    "work_performance_score between 1 and 5",
    selfEvaluation.work_performance_score >= 1 &&
      selfEvaluation.work_performance_score <= 5,
  );
  TestValidator.predicate(
    "knowledge_skill_score between 1 and 5",
    selfEvaluation.knowledge_skill_score >= 1 &&
      selfEvaluation.knowledge_skill_score <= 5,
  );
  TestValidator.predicate(
    "problem_solving_collab_score between 1 and 5",
    selfEvaluation.problem_solving_collab_score >= 1 &&
      selfEvaluation.problem_solving_collab_score <= 5,
  );
  TestValidator.predicate(
    "innovation_score between 1 and 5",
    selfEvaluation.innovation_score >= 1 &&
      selfEvaluation.innovation_score <= 5,
  );
  TestValidator.predicate(
    "overall_comment is non-empty string",
    typeof selfEvaluation.overall_comment === "string" &&
      selfEvaluation.overall_comment.length > 0,
  );
}
