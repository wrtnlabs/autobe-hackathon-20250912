import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * This test validates the deletion of a regular user by their ID with a
 * premium user's authorization. It follows a multi-actor workflow with role
 * switching and tests both success and unauthorized failure cases.
 *
 * 1. Create a premium user to get authentication credentials.
 * 2. Create a regular user to have a valid target for deletion.
 * 3. Authenticate the premium user to establish proper authorization.
 * 4. Delete the regular user by ID using the premium user's authorization.
 * 5. Confirm successful deletion.
 * 6. Perform unauthorized tests:
 *
 *    - Deletion attempt without any authentication.
 *    - Deletion attempt with regular user authentication.
 * 7. Validate that unauthorized attempts fail correctly.
 */
export async function test_api_regular_user_deletion_with_premiumuser_authentication(
  connection: api.IConnection,
) {
  // 1. Create a premium user account
  const premiumUserCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(128),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUser = await api.functional.auth.premiumUser.join(connection, {
    body: premiumUserCreateBody,
  });
  typia.assert(premiumUser);

  // 2. Create a regular user account
  const regularUserCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(128),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const regularUser = await api.functional.auth.regularUser.join(connection, {
    body: regularUserCreateBody,
  });
  typia.assert(regularUser);

  // 3. Authenticate premium user to establish session
  const premiumUserLoginBody = {
    email: premiumUser.email,
    password_hash: premiumUserCreateBody.password_hash,
  } satisfies IRecipeSharingPremiumUser.ILogin;

  const authenticatedPremiumUser = await api.functional.auth.premiumUser.login(
    connection,
    { body: premiumUserLoginBody },
  );
  typia.assert(authenticatedPremiumUser);

  // Create a connection clone to simulate premiumUser authorized context
  const premiumUserConnection: api.IConnection = { ...connection };

  // 4. Delete the regular user with premiumUser authorization
  await api.functional.recipeSharing.premiumUser.regularUsers.erase(
    premiumUserConnection,
    { id: regularUser.id },
  );

  // 5. Attempt deletion without authentication - expect failure
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated regular user deletion should fail",
    async () => {
      await api.functional.recipeSharing.premiumUser.regularUsers.erase(
        unauthenticatedConnection,
        { id: regularUser.id },
      );
    },
  );

  // 6. Authenticate as regular user
  const regularUserLoginBody = {
    email: regularUser.email,
    password_hash: regularUserCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const authenticatedRegularUser = await api.functional.auth.regularUser.login(
    connection,
    { body: regularUserLoginBody },
  );
  typia.assert(authenticatedRegularUser);

  // Create a connection clone to simulate regularUser authorized context
  const regularUserConnection: api.IConnection = { ...connection };

  // 7. Attempt deletion using regularUser authentication - expect failure
  await TestValidator.error(
    "regular user deletion attempt should fail",
    async () => {
      await api.functional.recipeSharing.premiumUser.regularUsers.erase(
        regularUserConnection,
        { id: regularUser.id },
      );
    },
  );
}
