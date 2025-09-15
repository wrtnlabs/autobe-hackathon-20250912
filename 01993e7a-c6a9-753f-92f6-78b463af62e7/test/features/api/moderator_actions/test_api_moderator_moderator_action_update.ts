import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingModeratorActions } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModeratorActions";

/**
 * E2E test verifying update functionality of moderator action records.
 *
 * Validates happy path of updating fields like action_type and comments.
 * Confirms validation errors on invalid update data. Ensures authorization
 * enforcement prevents unauthenticated updates.
 *
 * Business flow:
 *
 * 1. Create moderator user and authenticate.
 * 2. Create moderator action record.
 * 3. Update the moderator action successfully and verify changes.
 * 4. Confirm validation rejects improper updates.
 * 5. Confirm unauthenticated update calls are denied.
 */
export async function test_api_moderator_moderator_action_update(
  connection: api.IConnection,
) {
  // 1. Create moderator user
  const moderatorCreateBody = {
    email: RandomGenerator.alphaNumeric(5) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderator);

  // 2. Moderator login
  const loginBody = {
    email: moderator.email,
    password_hash: moderatorCreateBody.password_hash,
  } satisfies IRecipeSharingModerator.ILogin;

  const loggedInModerator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInModerator);

  // 3. Create moderator action
  const actionCreateBody = {
    moderator_id: moderator.id,
    action_type: "hide_review",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    action_timestamp: new Date().toISOString(),
    comments: "Initial hide review due to spam",
  } satisfies IRecipeSharingModeratorActions.ICreate;

  const createdAction: IRecipeSharingModeratorActions =
    await api.functional.recipeSharing.moderator.moderatorActions.create(
      connection,
      {
        body: actionCreateBody,
      },
    );
  typia.assert(createdAction);
  TestValidator.equals(
    "Moderator action creation moderator_id",
    createdAction.moderator_id,
    actionCreateBody.moderator_id,
  );

  // 4. Update moderator action
  const updateBody = {
    action_type: "unhide_review",
    comments: "Re-assessed and unhid the review.",
    action_timestamp: new Date().toISOString(),
  } satisfies IRecipeSharingModeratorActions.IUpdate;

  const updatedAction: IRecipeSharingModeratorActions =
    await api.functional.recipeSharing.moderator.moderatorActions.update(
      connection,
      {
        id: createdAction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAction);

  TestValidator.equals(
    "Updated action_type should be unhide_review",
    updatedAction.action_type,
    updateBody.action_type,
  );
  TestValidator.equals(
    "Updated comments should match",
    updatedAction.comments,
    updateBody.comments,
  );

  // 5. Validation error scenario
  await TestValidator.error(
    "Update action with invalid action_type should fail",
    async () => {
      await api.functional.recipeSharing.moderator.moderatorActions.update(
        connection,
        {
          id: createdAction.id,
          body: {
            action_type: "",
          },
        },
      );
    },
  );

  // 6. Authorization error scenario
  // Create unauthenticated connection by removing all headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "Update moderator action without authentication should fail",
    async () => {
      await api.functional.recipeSharing.moderator.moderatorActions.update(
        unauthConn,
        {
          id: createdAction.id,
          body: {
            comments: "Trying unauthorized update",
          },
        },
      );
    },
  );
}
