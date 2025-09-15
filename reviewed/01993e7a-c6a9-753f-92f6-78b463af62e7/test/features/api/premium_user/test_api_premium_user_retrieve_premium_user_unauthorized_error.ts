import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Test the retrieval of premium user details without authentication tokens.
 *
 * 1. Create a premium user by calling the join operation to provide valid
 *    context.
 * 2. Attempt to retrieve premium user details by ID using an unauthenticated
 *    connection (no auth token).
 * 3. Validate that the API call throws an authorization error.
 * 4. Attempt to retrieve premium user details by ID using a connection with an
 *    invalid auth token.
 * 5. Validate that this call also throws an authorization error.
 */
export async function test_api_premium_user_retrieve_premium_user_unauthorized_error(
  connection: api.IConnection,
) {
  // Step 1: Create a premium user with proper authentication
  const premiumUser = await api.functional.auth.premiumUser.join(connection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@example.com",
      password_hash: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
    } satisfies IRecipeSharingPremiumUser.ICreate,
  });
  typia.assert(premiumUser);

  // Step 2: Attempt retrieval without authentication - create unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Attempt to retrieve premium user details with no auth token
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.recipeSharing.premiumUser.premiumUsers.at(
      unauthenticatedConnection,
      {
        id: premiumUser.id,
      },
    );
  });

  // Step 3: Create a connection with invalid auth token
  const invalidAuthConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer invalid.token.value" },
  };

  // Attempt to retrieve premium user details with invalid auth token
  await TestValidator.error(
    "access with invalid auth token should fail",
    async () => {
      await api.functional.recipeSharing.premiumUser.premiumUsers.at(
        invalidAuthConnection,
        {
          id: premiumUser.id,
        },
      );
    },
  );
}
