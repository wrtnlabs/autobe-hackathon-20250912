import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingStoreIngredientPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingStoreIngredientPrice";

/**
 * Validate failure when creating store ingredient price with missing or
 * invalid grocery_store_id or ingredient_id.
 *
 * This test verifies that the API rejects creation attempts where required
 * identifiers are missing or invalid. It begins by registering and
 * authenticating a premium user to establish the appropriate security
 * context. Then it attempts to create store ingredient price records with
 * invalid grocery_store_id or ingredient_id values represented as empty
 * strings or zero UUIDs, which are invalid but conform to the required
 * string type. Expected result is that the API responds with errors,
 * confirmed by TestValidator.error assertions.
 */
export async function test_api_store_ingredient_price_creation_missing_ids_premiumuser(
  connection: api.IConnection,
) {
  // Register and authenticate a premium user
  const email = typia.random<string & tags.Format<"email">>();
  const password_hash = RandomGenerator.alphaNumeric(60);
  const username = RandomGenerator.name();

  const user: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: {
        email,
        password_hash,
        username,
      } satisfies IRecipeSharingPremiumUser.ICreate,
    });
  typia.assert(user);

  // Prepare a base valid store ingredient price creation body
  const basePriceCreate =
    typia.random<IRecipeSharingStoreIngredientPrice.ICreate>();

  // Attempt creation with empty string grocery_store_id (invalid but string)
  await TestValidator.error(
    "fail creation with empty grocery_store_id",
    async () => {
      await api.functional.recipeSharing.premiumUser.storeIngredientPrices.create(
        connection,
        {
          body: {
            ...basePriceCreate,
            grocery_store_id: "",
          },
        },
      );
    },
  );

  // Attempt creation with empty string ingredient_id (invalid but string)
  await TestValidator.error(
    "fail creation with empty ingredient_id",
    async () => {
      await api.functional.recipeSharing.premiumUser.storeIngredientPrices.create(
        connection,
        {
          body: {
            ...basePriceCreate,
            ingredient_id: "",
          },
        },
      );
    },
  );

  // Attempt creation with zero UUID grocery_store_id (invalid business ID but valid string format)
  await TestValidator.error(
    "fail creation with zero UUID grocery_store_id",
    async () => {
      await api.functional.recipeSharing.premiumUser.storeIngredientPrices.create(
        connection,
        {
          body: {
            ...basePriceCreate,
            grocery_store_id: "00000000-0000-0000-0000-000000000000",
          },
        },
      );
    },
  );

  // Attempt creation with zero UUID ingredient_id (invalid business ID but valid string format)
  await TestValidator.error(
    "fail creation with zero UUID ingredient_id",
    async () => {
      await api.functional.recipeSharing.premiumUser.storeIngredientPrices.create(
        connection,
        {
          body: {
            ...basePriceCreate,
            ingredient_id: "00000000-0000-0000-0000-000000000000",
          },
        },
      );
    },
  );
}
