import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalKnowledgeArea } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalKnowledgeArea";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * This test verifies that an authenticated manager can successfully update
 * an existing knowledge area.
 *
 * The workflow includes:
 *
 * 1. Manager user registration and authentication via /auth/manager/join.
 * 2. Creation of a mock original knowledge area using typia.random to obtain a
 *    valid UUID for update.
 * 3. Updating the knowledge area with new code, name, and description fields.
 * 4. Confirmation that the update response matches expected values, with
 *    strict type and business validation.
 *
 * This ensures the update endpoint enforces authorization, validates input
 * data, and returns the updated resource correctly.
 */
export async function test_api_knowledge_area_update_success_with_manager_authentication(
  connection: api.IConnection,
) {
  // 1. Register manager user and authenticate
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = "password123";
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: managerPassword,
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Prepare knowledge area update data and simulate creating original knowledge area
  const originalKnowledgeArea: IJobPerformanceEvalKnowledgeArea =
    typia.random<IJobPerformanceEvalKnowledgeArea>();
  typia.assert(originalKnowledgeArea);

  // 3. Construct an update payload with new code, name, description (can be null)
  const updateBody = {
    code: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 }),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IJobPerformanceEvalKnowledgeArea.IUpdate;

  // 4. Execute knowledge area update API call
  const updatedKnowledgeArea: IJobPerformanceEvalKnowledgeArea =
    await api.functional.jobPerformanceEval.manager.knowledgeAreas.updateKnowledgeArea(
      connection,
      {
        id: originalKnowledgeArea.id,
        body: updateBody,
      },
    );
  typia.assert(updatedKnowledgeArea);

  // 5. Validate that the updated knowledge area has the same ID
  TestValidator.equals(
    "knowledge area ID should not change on update",
    updatedKnowledgeArea.id,
    originalKnowledgeArea.id,
  );

  // 6. Validate that the updated knowledge area reflects the update fields
  TestValidator.equals(
    "knowledge area code updated correctly",
    updatedKnowledgeArea.code,
    updateBody.code,
  );
  TestValidator.equals(
    "knowledge area name updated correctly",
    updatedKnowledgeArea.name,
    updateBody.name,
  );

  if (updateBody.description === null) {
    TestValidator.equals(
      "knowledge area description is null as updated",
      updatedKnowledgeArea.description,
      null,
    );
  } else {
    TestValidator.equals(
      "knowledge area description updated correctly",
      updatedKnowledgeArea.description,
      updateBody.description,
    );
  }
}
