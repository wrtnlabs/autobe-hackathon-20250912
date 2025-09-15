import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingDifficultyLevels } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDifficultyLevels";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Test that creating a difficulty level fails if the user is unauthorized (not
 * authenticated as a moderator).
 *
 * This verifies that access control is enforced by attempting creation with no
 * authentication and with empty authentication headers, expecting the calls to
 * fail.
 */
export async function test_api_difficultylevel_create_unauthorized_failure(
  connection: api.IConnection,
) {
  // Attempt to create a difficulty level WITHOUT authenticating (no token set in connection)
  const unauthorizedBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: "Unauthorized attempt to create difficulty level",
  } satisfies IRecipeSharingDifficultyLevels.ICreate;

  await TestValidator.error(
    "unauthorized user cannot create difficulty level",
    async () => {
      await api.functional.recipeSharing.moderator.difficultyLevels.create(
        connection,
        {
          body: unauthorizedBody,
        },
      );
    },
  );

  // Additionally, try with a connection that simulates empty or invalid token (empty headers) to confirm failure
  const emptyAuthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "empty authentication headers should fail to create difficulty level",
    async () => {
      await api.functional.recipeSharing.moderator.difficultyLevels.create(
        emptyAuthConnection,
        {
          body: unauthorizedBody,
        },
      );
    },
  );
}
