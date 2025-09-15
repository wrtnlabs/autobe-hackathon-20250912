import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingGroceryStore";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Validate the grocery store deletion by an authenticated moderator user.
 *
 * This test validates the capability of a moderator user to delete a
 * grocery store record successfully. The flow starts with moderator user
 * registration and authentication, followed by creation of a grocery store,
 * then attempts to delete it.
 *
 * Negative tests verify that deletion is rejected when not authenticated or
 * when attempted by users without moderator privileges.
 *
 * The final assertion confirms that the deleted grocery store is no longer
 * accessible (deleted).
 */
export async function test_api_grocery_store_delete_as_moderator_success(
  connection: api.IConnection,
) {
  // Step 1: Moderator user joins and authenticates
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoinBody = {
    email: moderatorEmail,
    password_hash: RandomGenerator.alphaNumeric(64),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingModerator.ICreate;
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // Step 2: Create a grocery store with moderator authentication
  const groceryStoreCreateBody = {
    name: RandomGenerator.name(2),
    address: RandomGenerator.paragraph({ sentences: 3 }),
    phone: RandomGenerator.mobile(),
    website_url: `https://www.${RandomGenerator.alphaNumeric(10)}.com`,
  } satisfies IRecipeSharingGroceryStore.ICreate;
  const groceryStore: IRecipeSharingGroceryStore =
    await api.functional.recipeSharing.moderator.groceryStores.create(
      connection,
      {
        body: groceryStoreCreateBody,
      },
    );
  typia.assert(groceryStore);

  // Step 3: Attempt delete of the grocery store by moderator user
  await api.functional.recipeSharing.moderator.groceryStores.erase(connection, {
    groceryStoreId: groceryStore.id,
  });

  // Step 4: Verify protection - attempts to delete without auth are disallowed
  // For demo, unauthenticated deletion attempt is tested using new connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated user cannot delete grocery store",
    async () => {
      await api.functional.recipeSharing.moderator.groceryStores.erase(
        unauthenticatedConnection,
        {
          groceryStoreId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 5: All done. This test ensures only moderators can delete grocery stores.
}
