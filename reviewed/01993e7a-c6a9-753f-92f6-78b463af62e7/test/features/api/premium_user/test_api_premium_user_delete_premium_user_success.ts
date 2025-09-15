import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Validates successful deletion of a premium user.
 *
 * This test covers the full lifecycle of creating a premium user account
 * via the join API, deleting the user with their unique ID using the DELETE
 * endpoint, and verifying the user is no longer accessible by expecting
 * errors on repeated deletions.
 *
 * Steps:
 *
 * 1. Create a premium user with properly randomized email, password hash, and
 *    username.
 * 2. Delete the newly created premium user using their unique ID.
 * 3. Verify deletion by attempting to delete again and asserting an error is
 *    thrown.
 *
 * This ensures the premium user deletion API fully removes users and
 * prevents subsequent access.
 */
export async function test_api_premium_user_delete_premium_user_success(
  connection: api.IConnection,
) {
  // Step 1: Create a premium user via join API
  const createBody = {
    email: `test-${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const authorizedUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Delete the created premium user by id
  await api.functional.recipeSharing.premiumUser.premiumUsers.erase(
    connection,
    {
      id: authorizedUser.id,
    },
  );

  // Step 3: Verify deleted user does not exist by attempting to delete again and expect an error
  await TestValidator.error(
    "deleting already deleted user should fail",
    async () => {
      await api.functional.recipeSharing.premiumUser.premiumUsers.erase(
        connection,
        {
          id: authorizedUser.id,
        },
      );
    },
  );
}
