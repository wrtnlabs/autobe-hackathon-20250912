import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingDifficultyLevels } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDifficultyLevels";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * This test validates that unauthorized users cannot update a difficulty level
 * using the PUT /recipeSharing/moderator/difficultyLevels/{id} endpoint. It
 * ensures that a moderator account join is done initially for context, then
 * attempts the update with a connection without proper authorization headers.
 * This test expects an access denied or authentication error.
 */
export async function test_api_difficultylevel_update_unauthorized_failure(
  connection: api.IConnection,
) {
  // 1. Join as moderator to setup authentication context
  const moderatorCreateBody = {
    email: RandomGenerator.pick(["moderator1@example.com", "mod2@example.com"]),
    password_hash: "hashedpassword123",
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderator);

  // 2. Difficulty level update data
  const difficultyLevelUpdateBody = {
    code: "ADV",
    name: "Advanced",
    description: "Advanced difficulty level",
  } satisfies IRecipeSharingDifficultyLevels.IUpdate;

  // 3. Create an unauthenticated connection (empty headers) to simulate unauthorized access
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 4. Use a valid UUID for difficulty level id
  const difficultyLevelId = typia.random<string & tags.Format<"uuid">>();

  // 5. Attempt update and expect an error
  await TestValidator.error(
    "updating difficulty level without authorization should fail",
    async () => {
      await api.functional.recipeSharing.moderator.difficultyLevels.update(
        unauthConnection,
        {
          id: difficultyLevelId,
          body: difficultyLevelUpdateBody,
        },
      );
    },
  );
}
