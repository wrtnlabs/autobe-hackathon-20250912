import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * This test validates that unauthorized access to the endpoint GET
 * /recipeSharing/premiumUser/regularUsers/{id} is properly rejected.
 *
 * It first registers a new premium user by calling the join API to
 * establish a valid user account. After that, it attempts to fetch a
 * regular user's details via the specified endpoint without providing an
 * authorization token. The request uses a connection with cleared headers
 * to simulate missing authentication credentials.
 *
 * The test expects an error to be thrown, validating that the backend
 * correctly enforces authentication and denies access when no valid token
 * is present.
 */
export async function test_api_premiumuser_regularuser_at_unauthorized_error(
  connection: api.IConnection,
) {
  // Step 1: Create a new premium user with realistic random data
  const premiumUserCreate = {
    email: `unauth_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUserAuthorized: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserCreate,
    });
  typia.assert(premiumUserAuthorized);

  // Step 2: Attempt unauthorized access by removing authorization headers
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "Unauthorized access to get regular user without token should fail",
    async () => {
      await api.functional.recipeSharing.premiumUser.regularUsers.at(
        unauthorizedConnection,
        {
          id: premiumUserAuthorized.id,
        },
      );
    },
  );
}
