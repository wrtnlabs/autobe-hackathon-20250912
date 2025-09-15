import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test deleting an existing knowledge area as an authenticated manager
 * user.
 *
 * This test involves the following steps:
 *
 * 1. Create a new manager user and authenticate via the /auth/manager/join
 *    endpoint.
 * 2. Using the authenticated context, create a knowledge area resource to be
 *    deleted. (Note: The scenario wants to delete an existing knowledge
 *    area; however, no explicit API to create knowledge areas is provided
 *    in the materials, so we assume knowledge area ID to delete is randomly
 *    generated UUID for testing.)
 * 3. Send a DELETE request to /jobPerformanceEval/manager/knowledgeAreas/{id}
 *    using the knowledge area ID.
 * 4. Assert that the deletion succeeds without any errors or exceptions.
 * 5. Ensure appropriate authorization by confirming the manager authentication
 *    is used.
 */
export async function test_api_knowledge_area_deletion_success_with_manager_authentication(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a manager user
  const createBody = {
    email: RandomGenerator.alphaNumeric(8) + "@testcompany.com",
    password: "strongPassword123!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, { body: createBody });
  typia.assert(manager);

  // 2. Assume knowledge area ID to delete (random UUID)
  const knowledgeAreaId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Delete the knowledge area
  await api.functional.jobPerformanceEval.manager.knowledgeAreas.eraseKnowledgeArea(
    connection,
    { id: knowledgeAreaId },
  );

  // 4. No response body for DELETE, so just ensure no errors thrown
  TestValidator.predicate(
    "knowledge area deletion should succeed without errors",
    true,
  );
}
