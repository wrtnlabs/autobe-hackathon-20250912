import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";

export async function test_api_self_evaluation_manager_detail_unauthorized(
  connection: api.IConnection,
) {
  // 1. Manager sign-up to create authentication context
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: "SecurePass123!",
        name: "Unauthorized Manager",
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Attempt to retrieve self-evaluation details with unauthorized manager (random UUID)
  const randomId: string = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "unauthorized manager cannot access self-evaluation details",
    async () => {
      await api.functional.jobPerformanceEval.manager.selfEvaluations.atSelfEvaluation(
        connection,
        {
          id: randomId,
        },
      );
    },
  );
}
