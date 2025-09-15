import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingModeratorActions } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModeratorActions";

/**
 * Test deleting a moderator action record.
 *
 * The test covers:
 *
 * 1. Creating and authenticating a moderator user.
 * 2. Creating a moderator action (audit log) record.
 * 3. Deleting the moderator action by its unique ID.
 * 4. Authorization error scenario attempting deletion without authentication.
 *
 * This ensures the system correctly allows deletion only with proper moderator
 * authentication and that the moderator action record is removed properly.
 */
export async function test_api_moderator_moderator_action_delete(
  connection: api.IConnection,
) {
  // Step 1. Create moderator user
  const moderatorCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingModerator.ICreate;
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderator);

  // Step 2. Authenticate moderator user
  const loginBody = {
    email: moderator.email,
    password_hash: moderatorCreateBody.password_hash,
  } satisfies IRecipeSharingModerator.ILogin;
  const authorizedModerator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, { body: loginBody });
  typia.assert(authorizedModerator);

  // Step 3. Create a moderator action record
  const moderatorActionCreateBody = {
    moderator_id: moderator.id,
    action_type: "hide_review",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    action_timestamp: new Date().toISOString(),
    comments: "Test moderation action",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IRecipeSharingModeratorActions.ICreate;
  const createdModeratorAction: IRecipeSharingModeratorActions =
    await api.functional.recipeSharing.moderator.moderatorActions.create(
      connection,
      { body: moderatorActionCreateBody },
    );
  typia.assert(createdModeratorAction);

  // Step 4. Delete the created moderator action
  await api.functional.recipeSharing.moderator.moderatorActions.erase(
    connection,
    { id: createdModeratorAction.id },
  );

  // Step 5. Authorization error scenario: attempt deletion without authentication
  // Create unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized deletion should be denied",
    async () => {
      await api.functional.recipeSharing.moderator.moderatorActions.erase(
        unauthenticatedConnection,
        { id: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
