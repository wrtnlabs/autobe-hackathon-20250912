import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Validates the successful retrieval of detailed information for a specific
 * moderator user by their unique ID.
 *
 * This test first registers a new moderator user, establishing a valid
 * authentication context with the moderator role. Then, it retrieves the
 * moderator's detailed information by the given ID, verifying that the
 * response matches the created moderator's data accurately. It ensures the
 * API properly enforces authentication requirements and returns complete,
 * consistent user information.
 *
 * Steps:
 *
 * 1. Create and authenticate a new moderator user via the join API.
 * 2. Retrieve moderator details by ID.
 * 3. Assert that the returned moderator data matches the created user data.
 * 4. Validate presence and format of timestamp and nullable fields.
 */
export async function test_api_moderator_at_success(
  connection: api.IConnection,
) {
  // 1. Create a moderator user and establish authentication
  const createBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;

  const authorizedModerator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: createBody });
  typia.assert(authorizedModerator);

  // 2. Retrieve moderator details by ID
  const detail: IRecipeSharingModerator =
    await api.functional.recipeSharing.moderator.moderators.at(connection, {
      id: authorizedModerator.id,
    });
  typia.assert(detail);

  // 3. Validate that returned moderator data matches created data
  TestValidator.equals(
    "retrieved moderator id should match created moderator id",
    detail.id,
    authorizedModerator.id,
  );
  TestValidator.equals(
    "retrieved moderator email should match created moderator email",
    detail.email,
    authorizedModerator.email,
  );
  TestValidator.equals(
    "retrieved moderator username should match created moderator username",
    detail.username,
    authorizedModerator.username,
  );

  // 4. Validate other fields are present and consistent
  TestValidator.equals(
    "retrieved moderator password_hash should match created password_hash",
    detail.password_hash,
    authorizedModerator.password_hash,
  );
  TestValidator.predicate(
    "retrieved moderator created_at should be ISO 8601 string",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "retrieved moderator updated_at should be ISO 8601 string",
    typeof detail.updated_at === "string" && detail.updated_at.length > 0,
  );
  TestValidator.predicate(
    "retrieved moderator deleted_at should be string or null",
    detail.deleted_at === null ||
      (typeof detail.deleted_at === "string" && detail.deleted_at.length > 0),
  );
}
