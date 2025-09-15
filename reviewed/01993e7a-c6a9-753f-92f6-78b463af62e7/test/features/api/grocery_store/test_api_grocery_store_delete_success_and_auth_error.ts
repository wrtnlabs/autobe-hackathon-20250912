import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingGroceryStore";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Test successful deletion of a grocery store record by a moderator with valid
 * authentication. Confirm that the store is removed and subsequent fetch by the
 * same ID returns Not Found error. Also test unauthorized access results in
 * authentication error.
 *
 * Workflow:
 *
 * 1. Moderator user joins and authenticates
 * 2. Moderator user logs in
 * 3. Create grocery store record
 * 4. Delete the grocery store record successfully
 * 5. Verify deletion by trying to delete again, expect error
 * 6. Attempt deletion on unauthenticated connection, expect authentication error
 */
export async function test_api_grocery_store_delete_success_and_auth_error(
  connection: api.IConnection,
) {
  // 1. Moderator user joins and authenticates
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPasswordHash = "P@ssw0rd123";
  const moderatorUsername = RandomGenerator.name();

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
        username: moderatorUsername,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Moderator user logs in
  const loggedInModerator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
      } satisfies IRecipeSharingModerator.ILogin,
    });
  typia.assert(loggedInModerator);

  // 3. Create grocery store record
  const groceryStoreCreateBody = {
    name: RandomGenerator.name(1),
    address: RandomGenerator.paragraph({ sentences: 3 }),
    phone: RandomGenerator.mobile(),
    website_url: `https://${RandomGenerator.name(1)}.example.com`,
  } satisfies IRecipeSharingGroceryStore.ICreate;

  const groceryStore: IRecipeSharingGroceryStore =
    await api.functional.recipeSharing.moderator.groceryStores.create(
      connection,
      {
        body: groceryStoreCreateBody,
      },
    );
  typia.assert(groceryStore);

  // 4. Delete the grocery store record successfully
  await api.functional.recipeSharing.moderator.groceryStores.erase(connection, {
    groceryStoreId: typia.assert<string & tags.Format<"uuid">>(groceryStore.id),
  });

  // 5. Verify deletion by trying to delete again, expect HTTP 404 error
  await TestValidator.httpError(
    "error on deleting already removed grocery store",
    404,
    async () => {
      await api.functional.recipeSharing.moderator.groceryStores.erase(
        connection,
        {
          groceryStoreId: typia.assert<string & tags.Format<"uuid">>(
            groceryStore.id,
          ),
        },
      );
    },
  );

  // 6. Attempt deletion on unauthenticated connection, expect HTTP 401 error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const newStore =
    await api.functional.recipeSharing.moderator.groceryStores.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(1),
          address: RandomGenerator.paragraph({ sentences: 2 }),
          phone: null,
          website_url: null,
        } satisfies IRecipeSharingGroceryStore.ICreate,
      },
    );
  typia.assert(newStore);

  await TestValidator.httpError(
    "unauthenticated deletion should fail",
    401,
    async () => {
      await api.functional.recipeSharing.moderator.groceryStores.erase(
        unauthenticatedConnection,
        {
          groceryStoreId: typia.assert<string & tags.Format<"uuid">>(
            newStore.id,
          ),
        },
      );
    },
  );
}
