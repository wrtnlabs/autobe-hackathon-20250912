import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingDifficultyLevels } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDifficultyLevels";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Validate retrieval of a specific difficulty level by unique ID.
 *
 * This test performs a comprehensive business flow:
 *
 * 1. Create a moderator user with realistic credentials.
 * 2. Log in the moderator user to establish authentication.
 * 3. Create a difficulty level entry with unique code, name, and description.
 * 4. Retrieve the created difficulty level entry using GET
 *    /difficultyLevels/{id}.
 * 5. Verify that all returned data properties precisely match the created
 *    entry, including id, code, name, description, created_at, and
 *    updated_at.
 *
 * The test ensures proper authorization handling and confirms the API's
 * correctness in both the creation and retrieval operations.
 */
export async function test_api_difficulty_level_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. Create a moderator user
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const createModeratorBody = {
    email: moderatorEmail,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingModerator.ICreate;
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createModeratorBody,
    });
  typia.assert(moderator);

  // 2. Log in the moderator user
  const loginBody = {
    email: moderatorEmail,
    password_hash: createModeratorBody.password_hash,
  } satisfies IRecipeSharingModerator.ILogin;
  const loggedInModerator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, { body: loginBody });
  typia.assert(loggedInModerator);

  // 3. Create a difficulty level entry
  const code = `code_${RandomGenerator.alphaNumeric(6)}`;
  const name = RandomGenerator.name();
  const description = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 7,
  });
  const createDifficultyLevelBody = {
    code,
    name,
    description,
  } satisfies IRecipeSharingDifficultyLevels.ICreate;
  const createdDifficultyLevel: IRecipeSharingDifficultyLevels =
    await api.functional.recipeSharing.moderator.difficultyLevels.create(
      connection,
      { body: createDifficultyLevelBody },
    );
  typia.assert(createdDifficultyLevel);

  // 4. Retrieve the created difficulty level by ID
  const retrievedDifficultyLevel: IRecipeSharingDifficultyLevels =
    await api.functional.recipeSharing.difficultyLevels.at(connection, {
      id: createdDifficultyLevel.id,
    });
  typia.assert(retrievedDifficultyLevel);

  // 5. Verify returned properties match the created entry
  TestValidator.equals(
    "id should match",
    retrievedDifficultyLevel.id,
    createdDifficultyLevel.id,
  );
  TestValidator.equals(
    "code should match",
    retrievedDifficultyLevel.code,
    createdDifficultyLevel.code,
  );
  TestValidator.equals(
    "name should match",
    retrievedDifficultyLevel.name,
    createdDifficultyLevel.name,
  );
  TestValidator.equals(
    "description should match",
    retrievedDifficultyLevel.description ?? null,
    createdDifficultyLevel.description ?? null,
  );
  TestValidator.equals(
    "created_at should match",
    retrievedDifficultyLevel.created_at,
    createdDifficultyLevel.created_at,
  );
  TestValidator.equals(
    "updated_at should match",
    retrievedDifficultyLevel.updated_at,
    createdDifficultyLevel.updated_at,
  );
}
