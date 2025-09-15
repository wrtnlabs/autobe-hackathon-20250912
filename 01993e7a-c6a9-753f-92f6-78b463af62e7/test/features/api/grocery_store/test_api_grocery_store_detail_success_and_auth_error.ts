import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingGroceryStore";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Validate the successful fetching of grocery store details and the
 * authorization failure without login.
 *
 * This test performs the following steps:
 *
 * 1. Creates a moderator user by joining with valid credentials.
 * 2. Creates a grocery store record with valid data using the authorized
 *    moderator context.
 * 3. Retrieves the grocery store details by the returned groceryStoreId and
 *    validates that the received data matches the created record.
 * 4. Attempts to retrieve the same grocery store details without
 *    authentication, expecting an error due to missing authorization.
 * 5. Logs back in as moderator to restore authentication context.
 *
 * This comprehensive test ensures the grocery store detail retrieval
 * endpoint functions correctly and securely restricts access to
 * authenticated moderators only.
 */
export async function test_api_grocery_store_detail_success_and_auth_error(
  connection: api.IConnection,
) {
  // 1. Create a new moderator user by join
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(32); // Simulate hashed password
  const moderatorCreateBody = {
    email: moderatorEmail,
    password_hash: moderatorPasswordHash,
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;

  const createdModerator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(createdModerator);

  // 2. Create a grocery store record with valid data
  const groceryStoreCreateBody = {
    name: RandomGenerator.name(3),
    address: null,
    phone: null,
    website_url: null,
  } satisfies IRecipeSharingGroceryStore.ICreate;

  const createdGroceryStore: IRecipeSharingGroceryStore =
    await api.functional.recipeSharing.moderator.groceryStores.create(
      connection,
      {
        body: groceryStoreCreateBody,
      },
    );
  typia.assert(createdGroceryStore);

  // 3. Fetch grocery store details by ID and verify
  const fetchedGroceryStore: IRecipeSharingGroceryStore =
    await api.functional.recipeSharing.moderator.groceryStores.at(connection, {
      groceryStoreId: createdGroceryStore.id,
    });
  typia.assert(fetchedGroceryStore);

  TestValidator.equals(
    "grocery store id matches created",
    fetchedGroceryStore.id,
    createdGroceryStore.id,
  );
  TestValidator.equals(
    "grocery store name matches created",
    fetchedGroceryStore.name,
    createdGroceryStore.name,
  );

  const createdAddress =
    createdGroceryStore.address === undefined
      ? null
      : createdGroceryStore.address;
  TestValidator.equals(
    "grocery store address matches created",
    fetchedGroceryStore.address ?? null,
    createdAddress,
  );

  const createdPhone =
    createdGroceryStore.phone === undefined ? null : createdGroceryStore.phone;
  TestValidator.equals(
    "grocery store phone matches created",
    fetchedGroceryStore.phone ?? null,
    createdPhone,
  );

  const createdWebsite =
    createdGroceryStore.website_url === undefined
      ? null
      : createdGroceryStore.website_url;
  TestValidator.equals(
    "grocery store website_url matches created",
    fetchedGroceryStore.website_url ?? null,
    createdWebsite,
  );

  // 4. Use unauthenticated connection to test authorization error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized fetch of grocery store detail should fail",
    async () => {
      await api.functional.recipeSharing.moderator.groceryStores.at(
        unauthenticatedConnection,
        {
          groceryStoreId: createdGroceryStore.id,
        },
      );
    },
  );

  // 5. Log back in as moderator to restore authentication context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password_hash: moderatorPasswordHash,
    } satisfies IRecipeSharingModerator.ILogin,
  });
}
