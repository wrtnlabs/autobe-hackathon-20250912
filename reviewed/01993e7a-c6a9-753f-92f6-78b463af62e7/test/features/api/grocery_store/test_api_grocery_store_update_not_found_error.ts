import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingGroceryStore";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Validate grocery store update failure on non-existent groceryStoreId.
 *
 * This test verifies that attempting to update a grocery store using an
 * invalid or non-existent groceryStoreId fails as expected, ensuring the
 * API correctly handles error cases for missing resources.
 *
 * Workflow:
 *
 * 1. Register and authenticate a moderator user to obtain authorization.
 * 2. Attempt to update a grocery store with a randomly generated UUID that
 *    does not exist.
 * 3. Use a valid IRecipeSharingGroceryStore.IUpdate DTO for the update
 *    payload.
 * 4. Assert that the API throws an error due to the invalid groceryStoreId.
 */
export async function test_api_grocery_store_update_not_found_error(
  connection: api.IConnection,
) {
  // 1. Register and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: RandomGenerator.alphaNumeric(64),
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Prepare update payload with valid IRecipeSharingGroceryStore.IUpdate fields
  const updatePayload = {
    name: RandomGenerator.name(2),
    address: RandomGenerator.paragraph({ sentences: 3 }),
    phone: RandomGenerator.mobile(),
    website_url: `https://www.${RandomGenerator.alphabets(8)}.com`,
  } satisfies IRecipeSharingGroceryStore.IUpdate;

  // 3. Use a random UUID that presumably does not exist
  const invalidGroceryStoreId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Attempt update and check for error thrown due to not found
  await TestValidator.error(
    "update should fail when groceryStoreId not found",
    async () => {
      await api.functional.recipeSharing.moderator.groceryStores.update(
        connection,
        {
          groceryStoreId: invalidGroceryStoreId,
          body: updatePayload,
        },
      );
    },
  );
}
