import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingGroceryStore";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

export async function test_api_grocery_store_creation_unauthorized_regular_user(
  connection: api.IConnection,
) {
  // 1. Create moderator user and authentication context
  const moderatorCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderator);

  // 2. Without switching auth, attempt unauthorized grocery store creation
  const groceryStoreCreateBody = {
    name: RandomGenerator.name(),
    address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    phone: RandomGenerator.mobile(),
    website_url: `https://${RandomGenerator.alphabets(6)}.com`,
  } satisfies IRecipeSharingGroceryStore.ICreate;

  await TestValidator.error(
    "unauthorized regular user cannot create grocery store",
    async () => {
      await api.functional.recipeSharing.moderator.groceryStores.create(
        connection,
        {
          body: groceryStoreCreateBody,
        },
      );
    },
  );
}
