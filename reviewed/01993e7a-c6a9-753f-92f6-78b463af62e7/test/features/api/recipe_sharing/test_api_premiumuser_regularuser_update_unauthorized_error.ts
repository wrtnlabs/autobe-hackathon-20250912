import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test unauthorized profile update attempt on premium user without valid
 * authentication token.
 *
 * This test validates the security enforcement of the premiumUser
 * regularUsers update endpoint. It ensures that attempts to update a
 * regular user's profile without proper authentication result in forbidden
 * or unauthorized error responses.
 *
 * Workflow:
 *
 * 1. Create and authenticate a premium user using the join API.
 * 2. Attempt to update a regular user's profile using the premiumUser update
 *    endpoint, without providing an authentication token or context.
 * 3. Verify that the attempt fails with an error indicating lack of
 *    authorization.
 */
export async function test_api_premiumuser_regularuser_update_unauthorized_error(
  connection: api.IConnection,
) {
  // 1. Join a new premium user (necessary to establish authorization context)
  const premiumUserCreateBody = {
    email: `test_user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(3).split(" ").join("_"),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUser = await api.functional.auth.premiumUser.join(connection, {
    body: premiumUserCreateBody,
  });
  typia.assert(premiumUser);

  // 2. Generate a random UUID string to represent a regular user ID for update
  const regularUserId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare update request body with some data (optional fields only)
  const updateBody = {
    email: `unauth_update_${RandomGenerator.alphaNumeric(6)}@example.com`,
    username: RandomGenerator.name(2).split(" ").join("_"),
  } satisfies IRecipeSharingRegularUser.IUpdate;

  // 4. Attempt to update regular user without authentication - expect error
  // Because no re-authentication call is done and the join sets auth headers,
  // to simulate unauthorized, use a new connection without headers or blank headers.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "Unauthorized attempt to update regular user should fail",
    async () => {
      await api.functional.recipeSharing.premiumUser.regularUsers.update(
        unauthenticatedConnection,
        {
          id: regularUserId,
          body: updateBody,
        },
      );
    },
  );
}
