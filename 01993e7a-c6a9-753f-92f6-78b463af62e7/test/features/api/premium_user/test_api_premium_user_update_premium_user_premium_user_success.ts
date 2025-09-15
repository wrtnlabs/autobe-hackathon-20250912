import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * This test validates the successful update of an existing premium user's
 * profile information (email, username, and premium_since) by ID when
 * authenticated as a premium user. The workflow performs the following steps:
 *
 * 1. Create a premium user using the join API to establish the user and
 *    authentication context;
 * 2. Update the profile information of the created premium user via the update API
 *    by their ID to modify email, username, and premium_since;
 * 3. Validate that the updated profile is correctly returned and that the changes
 *    have taken effect;
 * 4. Repeat the update operation with different data to confirm repeated update
 *    capability.
 */
export async function test_api_premium_user_update_premium_user_premium_user_success(
  connection: api.IConnection,
) {
  // Step 1: Create a premium user and authenticate (join)
  const createBody1 = {
    email: `user${RandomGenerator.alphaNumeric(5)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: `user${RandomGenerator.alphabets(8)}`,
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const createdUser1 = await api.functional.auth.premiumUser.join(connection, {
    body: createBody1,
  });
  typia.assert(createdUser1);

  // Step 2: Update the premium user profile with new email, username, and premium_since
  const updateBody1 = {
    email: `updated${RandomGenerator.alphaNumeric(5)}@example.com`,
    username: `updated${RandomGenerator.alphabets(8)}`,
    premium_since: new Date().toISOString(),
  } satisfies IRecipeSharingPremiumUser.IUpdate;

  const updatedUser1 =
    await api.functional.recipeSharing.premiumUser.premiumUsers.update(
      connection,
      {
        id: createdUser1.id,
        body: updateBody1,
      },
    );
  typia.assert(updatedUser1);

  // Step 3: Validate that the updated fields match requested update
  TestValidator.equals(
    "updated email matches",
    updatedUser1.email,
    updateBody1.email,
  );
  TestValidator.equals(
    "updated username matches",
    updatedUser1.username,
    updateBody1.username,
  );
  TestValidator.equals(
    "updated premium_since matches",
    updatedUser1.premium_since,
    updateBody1.premium_since,
  );

  // Step 4: Repeat update with different data on the same user
  const updateBody2 = {
    email: `repeat${RandomGenerator.alphaNumeric(5)}@example.com`,
    username: `repeat${RandomGenerator.alphabets(8)}`,
    premium_since: new Date(Date.now() - 86400000).toISOString(),
  } satisfies IRecipeSharingPremiumUser.IUpdate;

  const updatedUser2 =
    await api.functional.recipeSharing.premiumUser.premiumUsers.update(
      connection,
      {
        id: createdUser1.id,
        body: updateBody2,
      },
    );
  typia.assert(updatedUser2);

  // Validate new updates applied correctly
  TestValidator.equals(
    "repeated update email matches",
    updatedUser2.email,
    updateBody2.email,
  );
  TestValidator.equals(
    "repeated update username matches",
    updatedUser2.username,
    updateBody2.username,
  );
  TestValidator.equals(
    "repeated update premium_since matches",
    updatedUser2.premium_since,
    updateBody2.premium_since,
  );
}
