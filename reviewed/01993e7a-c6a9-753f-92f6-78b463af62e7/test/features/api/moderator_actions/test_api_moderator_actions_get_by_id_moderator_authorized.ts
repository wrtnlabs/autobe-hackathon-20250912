import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingModeratorActions } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModeratorActions";

/**
 * Test retrieving detailed information of a specific moderator action entry by
 * ID. Ensures only authenticated moderators can access this endpoint. Validates
 * retrieval with a valid existing action ID returns full details, and error
 * response is received for invalid or non-existent IDs.
 *
 * This test follows these steps:
 *
 * 1. Moderator user registration to obtain authentication tokens.
 * 2. Retrieve moderator action detail using a valid (simulated) moderator action
 *    ID.
 * 3. Validate the details of the retrieved moderator action including ID matching.
 * 4. Attempt retrieval of a moderator action with a non-existent ID expecting an
 *    error.
 */
export async function test_api_moderator_actions_get_by_id_moderator_authorized(
  connection: api.IConnection,
) {
  // 1. Moderator user registration to get authorization tokens
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(32); // Simulated password hash
  const moderatorUsername = RandomGenerator.name();

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
        username: moderatorUsername,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Retrieve moderator action by valid ID
  const existingActionId = typia.random<string & tags.Format<"uuid">>();
  // This simulates an existing ID for testing

  const action: IRecipeSharingModeratorActions =
    await api.functional.recipeSharing.moderator.moderatorActions.at(
      connection,
      {
        id: existingActionId,
      },
    );
  typia.assert(action);

  // 3. Check that returned action ID matches requested
  TestValidator.equals(
    "retrieved action ID matches requested",
    action.id,
    existingActionId,
  );

  // 4. Attempt to retrieve a moderator action by non-existent ID and expect error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "retrieve non-existent moderator action throws error",
    async () => {
      await api.functional.recipeSharing.moderator.moderatorActions.at(
        connection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
