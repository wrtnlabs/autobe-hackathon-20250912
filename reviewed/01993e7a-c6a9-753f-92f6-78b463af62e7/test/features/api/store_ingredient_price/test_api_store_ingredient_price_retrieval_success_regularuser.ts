import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingStoreIngredientPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingStoreIngredientPrice";

/**
 * Tests the successful retrieval of store ingredient price details by an
 * authenticated regular user.
 *
 * This test function performs the following steps:
 *
 * 1. Registers a new regular user through the join endpoint.
 * 2. Uses the authenticated user's context to request detailed information
 *    about a specific store ingredient price by a synthetically generated
 *    valid UUID.
 * 3. Validates all aspects of the response, including all required fields and
 *    their proper data types and formats.
 *
 * This ensures that the API correctly handles authenticated detail
 * retrieval for store ingredient prices and that the response conforms
 * strictly to the API schema and business expectations.
 *
 * No error scenarios are tested here, only the happy path with valid
 * inputs.
 */
export async function test_api_store_ingredient_price_retrieval_success_regularuser(
  connection: api.IConnection,
) {
  // Step 1: Register a new regular user and authenticate
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Generate a valid UUID to request store ingredient price details
  const storeIngredientPriceId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve store ingredient price details
  const priceDetails: IRecipeSharingStoreIngredientPrice =
    await api.functional.recipeSharing.regularUser.storeIngredientPrices.at(
      connection,
      { storeIngredientPriceId },
    );
  typia.assert(priceDetails);

  // Step 4: Validate the major properties
  TestValidator.predicate(
    "store ingredient price id is a non-empty UUID string",
    typeof priceDetails.id === "string" && priceDetails.id.length > 0,
  );

  TestValidator.predicate(
    "grocery_store_id is a non-empty UUID string",
    typeof priceDetails.grocery_store_id === "string" &&
      priceDetails.grocery_store_id.length > 0,
  );

  TestValidator.predicate(
    "ingredient_id is a non-empty UUID string",
    typeof priceDetails.ingredient_id === "string" &&
      priceDetails.ingredient_id.length > 0,
  );

  TestValidator.predicate(
    "price is a number",
    typeof priceDetails.price === "number",
  );

  TestValidator.predicate(
    "available is a boolean",
    typeof priceDetails.available === "boolean",
  );

  // ISO 8601 date-time regex (basic check)
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/;

  TestValidator.predicate(
    "last_updated is ISO 8601 date-time string",
    typeof priceDetails.last_updated === "string" &&
      iso8601Regex.test(priceDetails.last_updated),
  );

  TestValidator.predicate(
    "created_at is ISO 8601 date-time string",
    typeof priceDetails.created_at === "string" &&
      iso8601Regex.test(priceDetails.created_at),
  );

  TestValidator.predicate(
    "updated_at is ISO 8601 date-time string",
    typeof priceDetails.updated_at === "string" &&
      iso8601Regex.test(priceDetails.updated_at),
  );
}
