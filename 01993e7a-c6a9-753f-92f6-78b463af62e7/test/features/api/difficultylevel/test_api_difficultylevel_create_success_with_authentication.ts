import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingDifficultyLevels } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDifficultyLevels";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * This test validates the authorized moderator user can successfully create a
 * difficulty level.
 *
 * Business Context:
 *
 * - Moderator user registration with unique email, hashed password, and username
 * - Upon join, moderator receives authentication tokens enabling authorized
 *   sessions
 * - Creation of difficulty levels requires authorization and unique code/name
 *
 * Test Workflow:
 *
 * 1. Register a new moderator with randomized but realistic credentials
 * 2. Verify moderator is authorized and has valid fields including tokens
 * 3. Create a new difficulty level with unique code, name, and optional
 *    description
 * 4. Verify the created difficulty level response for completeness and accuracy
 */
export async function test_api_difficultylevel_create_success_with_authentication(
  connection: api.IConnection,
) {
  // 1. Join moderator with unique credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password_hash = RandomGenerator.alphaNumeric(32); // Simulated hash
  const username = RandomGenerator.name();

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: email,
        password_hash: password_hash,
        username: username,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Prepare unique difficulty level create data
  const code = RandomGenerator.alphaNumeric(6).toUpperCase();
  const name = RandomGenerator.name();
  // Optionally include description
  const description = RandomGenerator.paragraph({ sentences: 3 });

  const createBody = {
    code: code,
    name: name,
    description: description,
  } satisfies IRecipeSharingDifficultyLevels.ICreate;

  // 3. Create difficulty level as authorized moderator
  const difficultyLevel: IRecipeSharingDifficultyLevels =
    await api.functional.recipeSharing.moderator.difficultyLevels.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(difficultyLevel);

  // 4. Validate the created difficulty level
  TestValidator.predicate(
    "Difficulty level has valid UUID id",
    typeof difficultyLevel.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        difficultyLevel.id,
      ),
  );
  TestValidator.equals("Created code matches", difficultyLevel.code, code);
  TestValidator.equals("Created name matches", difficultyLevel.name, name);

  // description is optional nullable string
  if (createBody.description === null || createBody.description === undefined) {
    TestValidator.predicate(
      "Description is null or undefined",
      difficultyLevel.description === null ||
        difficultyLevel.description === undefined,
    );
  } else {
    TestValidator.equals(
      "Created description matches",
      difficultyLevel.description,
      createBody.description,
    );
  }

  // Check timestamps format (ISO 8601 date-time)
  TestValidator.predicate(
    "created_at is ISO 8601 date-time string",
    typeof difficultyLevel.created_at === "string" &&
      !isNaN(Date.parse(difficultyLevel.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time string",
    typeof difficultyLevel.updated_at === "string" &&
      !isNaN(Date.parse(difficultyLevel.updated_at)),
  );
}
