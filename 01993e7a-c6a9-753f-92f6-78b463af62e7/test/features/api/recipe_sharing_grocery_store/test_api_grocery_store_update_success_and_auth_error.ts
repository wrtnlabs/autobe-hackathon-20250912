import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingGroceryStore";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Test updating grocery store information successfully and validate
 * authentication errors.
 *
 * This E2E test covers the scenario where a moderator user signs up and
 * authenticates, then creates a grocery store record. It updates the
 * grocery store with new information, validating updated values. The test
 * also attempts an unauthorized update with a connection lacking
 * authentication and expects an authorization error.
 *
 * Steps:
 *
 * 1. Moderator joins (sign up) and authenticates yielding authorization token.
 * 2. Create a grocery store record with valid data.
 * 3. Update the grocery store's name, address, phone, and website URL.
 * 4. Assert the update response's values match the updated data.
 * 5. Attempt to update the same grocery store with unauthenticated connection.
 * 6. Assert that the unauthorized update attempt fails with an error.
 */
export async function test_api_grocery_store_update_success_and_auth_error(
  connection: api.IConnection,
) {
  // 1. Moderator user signs up and authenticates
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorCreateBody = {
    email: moderatorEmail,
    password_hash: moderatorPassword,
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderator);

  // 2. Create a grocery store record
  const groceryStoreCreateBody = {
    name: RandomGenerator.name(3),
    address: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    phone: RandomGenerator.mobile(),
    website_url: `https://${RandomGenerator.alphaNumeric(8)}.com`,
  } satisfies IRecipeSharingGroceryStore.ICreate;

  const groceryStore: IRecipeSharingGroceryStore =
    await api.functional.recipeSharing.moderator.groceryStores.create(
      connection,
      {
        body: groceryStoreCreateBody,
      },
    );
  typia.assert(groceryStore);

  // 3. Update grocery store information with new data
  const updatedName = RandomGenerator.name(4);
  const updatedAddress = RandomGenerator.paragraph({
    sentences: 7,
    wordMin: 5,
    wordMax: 12,
  });
  const updatedPhone = RandomGenerator.mobile();
  const updatedWebsiteUrl = `https://${RandomGenerator.alphaNumeric(10)}.org`;

  const updateBody = {
    name: updatedName,
    address: updatedAddress,
    phone: updatedPhone,
    website_url: updatedWebsiteUrl,
  } satisfies IRecipeSharingGroceryStore.IUpdate;

  const updatedGroceryStore: IRecipeSharingGroceryStore =
    await api.functional.recipeSharing.moderator.groceryStores.update(
      connection,
      {
        groceryStoreId: groceryStore.id,
        body: updateBody,
      },
    );
  typia.assert(updatedGroceryStore);

  // 4. Validate that the returned grocery store matches the updated info
  TestValidator.equals(
    "updated grocery store name matches",
    updatedGroceryStore.name,
    updatedName,
  );
  TestValidator.equals(
    "updated grocery store address matches",
    updatedGroceryStore.address ?? null,
    updatedAddress,
  );
  TestValidator.equals(
    "updated grocery store phone matches",
    updatedGroceryStore.phone ?? null,
    updatedPhone,
  );
  TestValidator.equals(
    "updated grocery store website_url matches",
    updatedGroceryStore.website_url ?? null,
    updatedWebsiteUrl,
  );

  // 5. Attempt unauthorized update with a new connection without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const updatedBodyUnauthorized = {
    name: RandomGenerator.name(2),
  } satisfies IRecipeSharingGroceryStore.IUpdate;
  await TestValidator.error(
    "unauthorized user cannot update grocery store",
    async () => {
      await api.functional.recipeSharing.moderator.groceryStores.update(
        unauthenticatedConnection,
        {
          groceryStoreId: groceryStore.id,
          body: updatedBodyUnauthorized,
        },
      );
    },
  );
}
