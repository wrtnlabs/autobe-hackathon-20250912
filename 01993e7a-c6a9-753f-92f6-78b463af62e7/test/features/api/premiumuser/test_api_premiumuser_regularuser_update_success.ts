import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test updating a premium user's ability to update a regular user profile.
 *
 * This test performs the following steps:
 *
 * 1. Authenticate a premium user to establish authorization context.
 * 2. Prepare update data with realistic email, username, and password hash.
 * 3. Generate a valid UUID for the regular user ID.
 * 4. Perform the update of the regular user profile with proper auth.
 * 5. Validate the returned updated user's properties for accuracy and format.
 * 6. Attempt to perform the update with no authentication and expect an error.
 *
 * The test ensures updates require proper premium user authentication and
 * that successful updates return accurate and complete user data.
 */
export async function test_api_premiumuser_regularuser_update_success(
  connection: api.IConnection,
) {
  // Step 1: Authenticate premium user to establish auth context
  const premiumUserCreate = {
    email: `user_${RandomGenerator.alphaNumeric(16)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserCreate,
    });
  typia.assert(premiumUser);

  // Step 2: Prepare regular user update info
  const updateInfo = {
    email: `updated_${RandomGenerator.alphaNumeric(16)}@example.com`,
    username: RandomGenerator.name(2),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies IRecipeSharingRegularUser.IUpdate;

  // Step 3: Generate a valid UUID for regular user id
  const regularUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 4: Perform update with authorization
  const updatedUser: IRecipeSharingRegularUser =
    await api.functional.recipeSharing.premiumUser.regularUsers.update(
      connection,
      { id: regularUserId, body: updateInfo },
    );
  typia.assert(updatedUser);

  // Step 5: Validate updated user's fields
  TestValidator.equals(
    "updated user id matches",
    updatedUser.id,
    regularUserId,
  );
  TestValidator.equals(
    "updated email matches",
    updatedUser.email,
    updateInfo.email,
  );
  TestValidator.equals(
    "updated username matches",
    updatedUser.username,
    updateInfo.username,
  );
  TestValidator.equals(
    "updated password_hash matches",
    updatedUser.password_hash,
    updateInfo.password_hash,
  );
  TestValidator.predicate(
    "updated user created_at is date-time",
    typeof updatedUser.created_at === "string" &&
      updatedUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated user updated_at is date-time",
    typeof updatedUser.updated_at === "string" &&
      updatedUser.updated_at.length > 0,
  );

  // Step 6: Attempt update with no authentication - expect failure
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized update attempt should fail",
    async () => {
      await api.functional.recipeSharing.premiumUser.regularUsers.update(
        unauthenticatedConnection,
        { id: regularUserId, body: updateInfo },
      );
    },
  );
}
