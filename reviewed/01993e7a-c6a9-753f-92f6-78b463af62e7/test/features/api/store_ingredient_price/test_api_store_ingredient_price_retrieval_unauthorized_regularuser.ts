import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingStoreIngredientPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingStoreIngredientPrice";

/**
 * Test failure when retrieving store ingredient price details without
 * authentication or with incorrect role, expecting authorization failure error
 * response.
 *
 * This test verifies that accessing the store ingredient price details API as a
 * regular user fails when no authentication or incorrect authentication is
 * provided. It confirms the API properly enforces authorization requirements.
 *
 * Steps:
 *
 * 1. Register a regular user (join) to meet authentication prerequisite.
 * 2. Attempt unauthorized access with connection having empty headers
 *    (unauthenticated).
 * 3. Attempt unauthorized access with connection having invalid bearer token in
 *    headers.
 *
 * Uses TestValidator.error with async/await to assert proper error throwing on
 * unauthorized accesses.
 */
export async function test_api_store_ingredient_price_retrieval_unauthorized_regularuser(
  connection: api.IConnection,
) {
  // Step 1: Regular user join (authentication prerequisite)
  const createBody = {
    email: `${typia.random<string & tags.Format<"email">>()}`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser = await api.functional.auth.regularUser.join(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(authorizedUser);

  // Step 2: Unauthorized access without authentication headers
  // Create new connection with empty headers explicitly (no mutation on original)
  const unauthConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized access without authentication should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.storeIngredientPrices.at(
        unauthConnection,
        {
          storeIngredientPriceId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 3: Unauthorized access with invalid token in headers
  // Create new connection with invalid Authorization header string
  const invalidTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalid_token" },
  };

  await TestValidator.error(
    "unauthorized access with invalid token should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.storeIngredientPrices.at(
        invalidTokenConnection,
        {
          storeIngredientPriceId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
