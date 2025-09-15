import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingShoppingListItem";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingShoppingListItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingListItem";

/**
 * E2E test for listing shopping list items for a premium user's shopping list.
 *
 * This test performs the following steps:
 *
 * 1. Creates a premium user account (join) and logs in.
 * 2. For a valid shoppingListId (random UUID), attempts to list items.
 * 3. Validates the returned shopping list items data structure and fields.
 * 4. Checks behavior for empty shopping list (no items).
 * 5. Tests error scenarios: unauthorized access and invalid shoppingListId format.
 *
 * It ensures correct retrieval of all expected fields, proper authorization
 * handling, and graceful handling of edge cases.
 *
 * All API responses are validated with typia.assert, and business logic is
 * asserted with descriptive messages via TestValidator.
 */
export async function test_api_shopping_list_items_listing_premium_user_valid_and_error_cases(
  connection: api.IConnection,
) {
  // 1. Create premium user account and login
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@test.com`,
    password_hash: "hashed_password_123",
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(premiumUser);

  // 2. Login again to confirm login endpoint (optional but as per dependencies)
  const userLoginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IRecipeSharingPremiumUser.ILogin;

  const loginUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(loginUser);

  // Prepare valid UUID shoppingListId for actual tests
  const validShoppingListId = typia.random<string & tags.Format<"uuid">>();

  // 3. Positive test: list shopping list items with valid shoppingListId
  const validResponse: IPageIRecipeSharingShoppingListItem.ISummary =
    await api.functional.recipeSharing.premiumUser.shoppingLists.shoppingListItems.index(
      connection,
      { shoppingListId: validShoppingListId },
    );
  typia.assert(validResponse);

  TestValidator.predicate(
    "data must be array",
    Array.isArray(validResponse.data),
  );
  TestValidator.predicate(
    "pagination object must exist",
    typeof validResponse.pagination === "object" &&
      validResponse.pagination !== null,
  );

  // Check each shopping list item properties if any
  for (const item of validResponse.data) {
    typia.assert(item);
    TestValidator.predicate(
      `item.id ${item.id} is valid UUID`,
      typeof item.id === "string" && /^[0-9a-fA-F-]{36}$/.test(item.id),
    );
    TestValidator.equals(
      "item quantity is number",
      typeof item.quantity,
      "number",
    );
    TestValidator.predicate(
      `item unit ${item.unit} is non-empty string`,
      typeof item.unit === "string" && item.unit.length > 0,
    );
  }

  // 4. Edge case: simulate empty shopping list items response via random UUID
  const emptyShoppingListId = typia.random<string & tags.Format<"uuid">>();

  const emptyResponse: IPageIRecipeSharingShoppingListItem.ISummary =
    await api.functional.recipeSharing.premiumUser.shoppingLists.shoppingListItems.index(
      connection,
      { shoppingListId: emptyShoppingListId },
    );
  typia.assert(emptyResponse);

  TestValidator.equals("empty list data length", emptyResponse.data.length, 0);
  TestValidator.predicate(
    "empty list pagination object exists",
    typeof emptyResponse.pagination === "object" &&
      emptyResponse.pagination !== null,
  );

  // 5. Unauthorized tests: Use unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized request must fail", async () => {
    await api.functional.recipeSharing.premiumUser.shoppingLists.shoppingListItems.index(
      unauthenticatedConnection,
      { shoppingListId: validShoppingListId },
    );
  });

  // 6. Invalid shoppingListId format test
  await TestValidator.error(
    "invalid shoppingListId format must fail",
    async () => {
      await api.functional.recipeSharing.premiumUser.shoppingLists.shoppingListItems.index(
        connection,
        { shoppingListId: "invalid-uuid-format" },
      );
    },
  );
}
