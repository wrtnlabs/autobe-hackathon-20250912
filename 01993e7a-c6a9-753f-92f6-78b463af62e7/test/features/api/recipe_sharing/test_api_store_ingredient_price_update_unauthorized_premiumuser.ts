import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingStoreIngredientPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingStoreIngredientPrice";

/**
 * Validate that updating store ingredient price without proper premium user
 * authentication or with invalid privileges is rejected.
 *
 * This test ensures that unauthorized users cannot perform updates on store
 * ingredient prices, enforcing authorization rules and protecting data
 * integrity.
 *
 * Steps:
 *
 * 1. Join a premium user account to set up context.
 * 2. Attempt to update a store ingredient price without authentication.
 * 3. Expect the update operation to fail due to authorization restrictions.
 */
export async function test_api_store_ingredient_price_update_unauthorized_premiumuser(
  connection: api.IConnection,
) {
  // Step 1: Join a premium user to establish the context
  const premiumUserBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserBody,
    });
  typia.assert(premiumUser);

  // Step 2: Prepare update payload for store ingredient price
  const updateBody = {
    price: 150,
    available: true,
    last_updated: new Date().toISOString(),
  } satisfies IRecipeSharingStoreIngredientPrice.IUpdate;

  const fakeStoreIngredientPriceId = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Attempt update without authentication (simulate unauthenticated connection)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Expect error due to missing authorization
  await TestValidator.error(
    "unauthorized update attempt without authentication should fail",
    async () => {
      await api.functional.recipeSharing.premiumUser.storeIngredientPrices.update(
        unauthConnection,
        {
          storeIngredientPriceId: fakeStoreIngredientPriceId,
          body: updateBody,
        },
      );
    },
  );
}
