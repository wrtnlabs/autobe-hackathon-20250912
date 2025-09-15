import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Tests successful update of a moderator user record.
 *
 * This test performs the following steps:
 *
 * 1. Creates a moderator user via the auth join endpoint to establish
 *    authentication context.
 * 2. Updates the moderator's info (email, username, password_hash) via the
 *    update endpoint.
 * 3. Asserts the response contains the updated values and valid metadata.
 *
 * This validates the ability to modify moderator user details and ensures
 * correct persistence and response structure with JWT token encapsulation.
 */
export async function test_api_moderator_update_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator to authenticate and get moderator info
  const moderatorCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(2),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies IRecipeSharingModerator.ICreate;

  const moderatorAuthorized: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderatorAuthorized);

  // Step 2: Prepare data to update moderator info
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(3),
    password_hash: RandomGenerator.alphaNumeric(40),
  } satisfies IRecipeSharingModerator.IUpdate;

  // Step 3: Perform update on the created moderator's ID
  const updatedModerator: IRecipeSharingModerator =
    await api.functional.recipeSharing.moderator.moderators.update(connection, {
      id: moderatorAuthorized.id,
      body: updateBody,
    });
  typia.assert(updatedModerator);

  // Step 4: Validate updated fields and metadata
  TestValidator.equals(
    "updated id equals original",
    updatedModerator.id,
    moderatorAuthorized.id,
  );
  TestValidator.equals(
    "updated email matches request",
    updatedModerator.email,
    updateBody.email,
  );
  TestValidator.equals(
    "updated username matches request",
    updatedModerator.username,
    updateBody.username,
  );
  TestValidator.equals(
    "updated password_hash matches request",
    updatedModerator.password_hash,
    updateBody.password_hash,
  );
  TestValidator.predicate(
    "created_at is a string",
    typeof updatedModerator.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is a string",
    typeof updatedModerator.updated_at === "string",
  );
  TestValidator.predicate(
    "deleted_at is either null or string",
    updatedModerator.deleted_at === null ||
      typeof updatedModerator.deleted_at === "string",
  );
}
