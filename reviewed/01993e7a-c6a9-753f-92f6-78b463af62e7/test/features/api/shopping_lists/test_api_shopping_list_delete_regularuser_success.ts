import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Validate the permanent deletion process of a shopping list belonging to a
 * regular user in the recipe sharing platform.
 *
 * This test confirms the correct authorization and ownership enforcement by
 * performing these steps:
 *
 * 1. A new regular user is created via the join API with realistic random
 *    credentials.
 * 2. The user logs in via the login API to obtain an authenticated session.
 * 3. (Note: The shopping list creation API is not provided, so the test assumes a
 *    shopping list exists represented by a generated UUID.)
 * 4. The test calls the DELETE API to erase the shopping list by its ID,
 *    simulating a normal operation.
 * 5. The test asserts successful completion of deletion without error.
 *
 * This scenario focuses on the success path for user-owned resource deletion
 * with proper authentication.
 */
export async function test_api_shopping_list_delete_regularuser_success(
  connection: api.IConnection,
) {
  // 1. Create a new regular user with join API
  const joinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const joinUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, { body: joinBody });
  typia.assert(joinUser);

  // 2. Login the newly created user
  const loginBody = {
    email: joinBody.email,
    password_hash: joinBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const loginUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loginUser);

  // 3. Since no shopping list creation API is provided, generate a UUID to simulate
  const shoppingListId = typia.random<string & tags.Format<"uuid">>();

  // 4. Delete the shopping list by shoppingListId for the logged-in user
  await api.functional.recipeSharing.regularUser.shoppingLists.erase(
    connection,
    { shoppingListId },
  );
}
