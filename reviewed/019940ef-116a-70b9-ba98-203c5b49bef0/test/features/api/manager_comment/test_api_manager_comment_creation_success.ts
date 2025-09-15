import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalManagerComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerComments";

/**
 * Test creating a new manager comment with valid input.
 *
 * The test begins by creating a new manager user via the authentication join
 * endpoint, establishing the manager context required for comment creation.
 *
 * A manager comment is then created with the new manager's ID, a random
 * evaluation cycle UUID, and generated comment text. The response is validated
 * to ensure creation success and data fidelity.
 *
 * This test does NOT cover failure scenarios for authentication or invalid
 * input, relying on schema validation guarantees to omit such cases.
 */
export async function test_api_manager_comment_creation_success(
  connection: api.IConnection,
) {
  // 1. Create a manager user by calling /auth/manager/join
  const managerCreateInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassw0rd!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;
  const managerAuthorized: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateInput,
    });
  typia.assert(managerAuthorized);

  // 2. Create a manager comment
  const commentCreateInput = {
    manager_id: managerAuthorized.id,
    evaluation_cycle_id: typia.random<string & tags.Format<"uuid">>(),
    comment: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IJobPerformanceEvalManagerComments.ICreate;

  // 3. Call the manager comment creation API
  const managerComment: IJobPerformanceEvalManagerComments =
    await api.functional.jobPerformanceEval.manager.managerComments.create(
      connection,
      {
        body: commentCreateInput,
      },
    );
  typia.assert(managerComment);

  // 4. Validate response content
  TestValidator.predicate(
    "id is not empty",
    typeof managerComment.id === "string" && managerComment.id.length > 0,
  );
  TestValidator.equals(
    "manager_id matches",
    managerComment.manager_id,
    managerAuthorized.id,
  );
  TestValidator.equals(
    "evaluation_cycle_id matches",
    managerComment.evaluation_cycle_id,
    commentCreateInput.evaluation_cycle_id,
  );
  TestValidator.equals(
    "comment content matches",
    managerComment.comment,
    commentCreateInput.comment,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    typeof managerComment.created_at === "string" &&
      !isNaN(Date.parse(managerComment.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    typeof managerComment.updated_at === "string" &&
      !isNaN(Date.parse(managerComment.updated_at)),
  );
}
