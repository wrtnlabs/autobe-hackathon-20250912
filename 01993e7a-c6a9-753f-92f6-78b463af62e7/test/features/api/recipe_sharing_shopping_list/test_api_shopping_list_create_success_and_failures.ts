import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";

/**
 * Test creating a new shopping list for a user.
 *
 * This test performs the following sequence:
 *
 * 1. Register and authenticate a new regular user.
 * 2. Successfully create a new shopping list with a valid user_id and name.
 * 3. Validate that the shopping list creation response contains proper IDs and
 *    timestamps with correct formats.
 * 4. Attempt to create a shopping list without authentication and expect failure.
 *
 * This comprehensive test ensures both successful creation and validation error
 * handling for the shopping list creation API endpoint.
 */
export async function test_api_shopping_list_create_success_and_failures(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new regular user
  const userBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userBody,
    });
  typia.assert(authorizedUser);

  // 2. Successfully create a new shopping list
  const shoppingListBody = {
    user_id: authorizedUser.id,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
  } satisfies IRecipeSharingShoppingList.ICreate;
  const shoppingList: IRecipeSharingShoppingList =
    await api.functional.recipeSharing.regularUser.shoppingLists.create(
      connection,
      {
        body: shoppingListBody,
      },
    );
  typia.assert(shoppingList);

  // Validate that returned shopping list matches request properties
  TestValidator.equals(
    "shopping list user_id matches",
    shoppingList.user_id,
    shoppingListBody.user_id,
  );
  TestValidator.equals(
    "shopping list name matches",
    shoppingList.name,
    shoppingListBody.name,
  );

  // Validate that id is a valid UUID
  TestValidator.predicate(
    "shopping list id is a valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      shoppingList.id,
    ),
  );

  // Validate that created_at and updated_at are valid ISO date-time strings
  TestValidator.predicate(
    "shopping list created_at is a valid ISO date-time",
    !isNaN(Date.parse(shoppingList.created_at)),
  );
  TestValidator.predicate(
    "shopping list updated_at is a valid ISO date-time",
    !isNaN(Date.parse(shoppingList.updated_at)),
  );

  // Validate that deleted_at is explicitly null
  TestValidator.equals(
    "shopping list deleted_at is null",
    shoppingList.deleted_at,
    null,
  );

  // 3. Attempt to create shopping list without authentication (unauthorized)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated create shopping list should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.shoppingLists.create(
        unauthenticatedConnection,
        {
          body: shoppingListBody,
        },
      );
    },
  );
}
