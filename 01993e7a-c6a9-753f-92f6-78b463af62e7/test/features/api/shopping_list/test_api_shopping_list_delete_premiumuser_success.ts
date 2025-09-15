import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * Test successful permanent deletion of a shopping list by its ID for a
 * premium user account.
 *
 * This test performs the workflow of:
 *
 * 1. Creating a premium user account via the join API.
 * 2. Logging in the premium user with the same credentials.
 * 3. Deleting a shopping list by its UUID using the delete API.
 *
 * Authorization headers are managed automatically by the SDK after join and
 * login. All API responses are validated with typia.assert to ensure type
 * safety. The test covers the success scenario of permanently deleting a
 * shopping list.
 *
 * Note: As the create shopping list API is not provided, the deletion uses
 * a randomly generated UUID to simulate a deletion scenario.
 *
 * @param connection The API connection object for making HTTP requests.
 */
export async function test_api_shopping_list_delete_premiumuser_success(
  connection: api.IConnection,
) {
  // 1. Create a premium user account
  const createRequest = {
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(1).replace(/\s/g, ""),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const createdUser = await api.functional.auth.premiumUser.join(connection, {
    body: createRequest,
  });
  typia.assert(createdUser);

  // 2. Login the premium user
  const loginRequest = {
    email: createdUser.email,
    password_hash: createRequest.password_hash,
  } satisfies IRecipeSharingPremiumUser.ILogin;

  const loggedInUser = await api.functional.auth.premiumUser.login(connection, {
    body: loginRequest,
  });
  typia.assert(loggedInUser);

  // 3. Delete the shopping list by UUID
  const shoppingListId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.recipeSharing.premiumUser.shoppingLists.erase(
    connection,
    { shoppingListId },
  );
  // Erase API returns void; success indicated by absence of exception
}
