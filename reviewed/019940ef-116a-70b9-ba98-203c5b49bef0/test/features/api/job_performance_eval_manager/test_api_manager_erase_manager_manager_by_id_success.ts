import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test the successful deletion of a manager by another manager.
 *
 * This test covers the end-to-end scenario where one manager creates an
 * account, then deletes another manager account, verifying authorization
 * flows.
 *
 * 1. Create the first manager account using the join endpoint.
 * 2. Create the second manager account.
 * 3. Use first manager's context to authorize and trigger deletion of the
 *    second.
 * 4. Validate deletion occurs successfully with no errors (HTTP 204 expected).
 */
export async function test_api_manager_erase_manager_manager_by_id_success(
  connection: api.IConnection,
) {
  // 1. Create the first manager user
  const firstManagerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const firstManagerPassword = "StrongPass123!";
  const firstManagerName = RandomGenerator.name();

  const firstManager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: firstManagerEmail,
        password: firstManagerPassword,
        name: firstManagerName,
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(firstManager);
  TestValidator.predicate(
    "first manager login authorized",
    firstManager.token.access.length > 0,
  );

  // 2. Create the second manager user
  const secondManagerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const secondManagerPassword = "StrongPass123!";
  const secondManagerName = RandomGenerator.name();

  const secondManager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: secondManagerEmail,
        password: secondManagerPassword,
        name: secondManagerName,
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(secondManager);
  TestValidator.predicate(
    "second manager login authorized",
    secondManager.token.access.length > 0,
  );

  // 3. Use first manager to delete second manager
  await api.functional.jobPerformanceEval.manager.managers.erase(connection, {
    id: secondManager.id,
  });
  TestValidator.predicate("second manager erased successfully", true);
}
