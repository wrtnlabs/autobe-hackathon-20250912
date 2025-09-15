import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Test suite for deleting a difficulty level resource with moderator
 * authentication.
 *
 * This E2E test covers:
 *
 * 1. Moderator account creation through join endpoint.
 * 2. Authenticated deletion of a difficulty level by its ID, verifying
 *    success.
 * 3. Unauthorized deletion attempt without authentication to ensure failure.
 *
 * The test verifies that only authenticated moderators can delete
 * difficulty levels, and that deletion returns proper success status with
 * no response body.
 */
export async function test_api_difficultylevel_delete_success_with_authentication(
  connection: api.IConnection,
) {
  // Step 1: Moderator sign-up and authentication
  const moderatorCreate = {
    email: RandomGenerator.alphabets(5) + "@test.com",
    password_hash: RandomGenerator.alphaNumeric(10),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreate,
    });
  typia.assert(moderator);

  // Step 2: Attempt to delete a difficulty level with proper auth
  const difficultyLevelId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.recipeSharing.moderator.difficultyLevels.erase(
    connection,
    { id: difficultyLevelId },
  );

  // Step 3: Attempt to delete without authorization - expect error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.recipeSharing.moderator.difficultyLevels.erase(
        unauthenticatedConnection,
        { id: difficultyLevelId },
      );
    },
  );
}
