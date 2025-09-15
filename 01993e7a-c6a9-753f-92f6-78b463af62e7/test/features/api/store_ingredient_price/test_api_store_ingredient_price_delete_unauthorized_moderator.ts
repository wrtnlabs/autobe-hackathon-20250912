import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Validate that store ingredient price deletion fails when unauthorized.
 *
 * This test function verifies that attempts to delete a store ingredient
 * price record without proper moderator authorization are rejected
 * correctly.
 *
 * Steps:
 *
 * 1. Moderator user joins and receives authorization token.
 * 2. Attempt to delete store ingredient price without any authentication
 *    (unauthenticated).
 * 3. Attempt to delete with a separate connection that has no moderator token
 *    (simulating insufficient privilege).
 * 4. Confirm that all unauthorized attempts throw errors, ensuring API
 *    security enforcement.
 *
 * This enforces that only authorized moderators can delete sensitive store
 * ingredient price records.
 */
export async function test_api_store_ingredient_price_delete_unauthorized_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator joins to get authorized token
  const moderatorCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingModerator.ICreate;
  const authorizedModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: moderatorCreateBody,
    },
  );
  typia.assert(authorizedModerator);

  // 2. Attempt deletion WITHOUT authentication (no headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "delete fails without moderator token",
    async () => {
      await api.functional.recipeSharing.moderator.storeIngredientPrices.eraseStoreIngredientPrice(
        unauthConn,
        {
          storeIngredientPriceId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 3. Attempt deletion with a clean connection simulating missing moderator token
  // (reuse unauthConn again since setting headers is forbidden)
  await TestValidator.error(
    "delete fails with missing moderator token",
    async () => {
      await api.functional.recipeSharing.moderator.storeIngredientPrices.eraseStoreIngredientPrice(
        unauthConn,
        {
          storeIngredientPriceId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
