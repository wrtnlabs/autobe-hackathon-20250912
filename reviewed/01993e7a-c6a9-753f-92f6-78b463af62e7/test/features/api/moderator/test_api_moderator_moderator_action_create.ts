import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingModeratorActions } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModeratorActions";

/**
 * This comprehensive test function verifies the process of creating a
 * moderator action record in a recipe sharing platform. It ensures that
 * only authenticated moderators can create moderation logs and that the
 * logs contain all required and optional information correctly.
 *
 * The test includes three main scenarios:
 *
 * 1. Happy path: Moderator user registration, login, and successful creation
 *    of a moderator action with all necessary fields. Validation checks
 *    confirm the response structure and values including timestamps and
 *    user association.
 * 2. Permission path: Attempting to create a moderator action with no valid
 *    moderator authentication, expecting the request to be rejected due to
 *    authorization failure.
 *
 * These scenarios collectively validate the functional integrity, input
 * validation, and access control of the moderator action creation
 * endpoint.
 */
export async function test_api_moderator_moderator_action_create(
  connection: api.IConnection,
) {
  // 1. Moderator registration
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(32);
  const moderatorUsername = RandomGenerator.name(2);

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
        username: moderatorUsername,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Moderator login (simulate re-authentication to refresh token)
  const loggedInModerator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
      } satisfies IRecipeSharingModerator.ILogin,
    });
  typia.assert(loggedInModerator);

  // 3. Happy path: Create moderator action with all required and optional fields
  const now = new Date().toISOString();
  const actionTypeSamples = [
    "hide_review",
    "unhide_review",
    "approve_category",
    "reject_category",
  ] as const;
  const actionType = RandomGenerator.pick(actionTypeSamples);

  const moderatorActionCreateBody = {
    moderator_id: moderator.id,
    action_type: actionType,
    target_id: typia.random<string & tags.Format<"uuid">>(),
    action_timestamp: now,
    comments: `Auto-generated test comment at ${now}`,
  } satisfies IRecipeSharingModeratorActions.ICreate;

  const createdModeratorAction: IRecipeSharingModeratorActions =
    await api.functional.recipeSharing.moderator.moderatorActions.create(
      connection,
      {
        body: moderatorActionCreateBody,
      },
    );
  typia.assert(createdModeratorAction);

  TestValidator.equals(
    "moderator ID matches",
    createdModeratorAction.moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "action type matches",
    createdModeratorAction.action_type,
    actionType,
  );
  TestValidator.equals(
    "target ID matches",
    createdModeratorAction.target_id,
    moderatorActionCreateBody.target_id,
  );
  TestValidator.equals(
    "action timestamp matches",
    createdModeratorAction.action_timestamp,
    now,
  );
  TestValidator.equals(
    "comments matches",
    createdModeratorAction.comments,
    moderatorActionCreateBody.comments,
  );

  // Validate timestamps presence and format
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof createdModeratorAction.created_at === "string" &&
      /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])(\.\d+)?Z$/.test(
        createdModeratorAction.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 string",
    typeof createdModeratorAction.updated_at === "string" &&
      /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])(\.\d+)?Z$/.test(
        createdModeratorAction.updated_at,
      ),
  );

  // 4. Permission scenario: create without valid moderator auth
  // Create an unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "creating moderator action fails without moderator authentication",
    async () => {
      await api.functional.recipeSharing.moderator.moderatorActions.create(
        unauthenticatedConnection,
        {
          body: moderatorActionCreateBody,
        },
      );
    },
  );
}
