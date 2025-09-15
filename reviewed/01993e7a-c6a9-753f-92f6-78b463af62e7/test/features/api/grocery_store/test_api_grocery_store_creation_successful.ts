import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingGroceryStore";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Test successful creation of a new grocery store by a moderator user.
 *
 * This includes:
 *
 * 1. Moderator user registration via join endpoint with valid randomly generated
 *    credentials.
 * 2. Confirm moderator authorization via received data.
 * 3. Create grocery store with required name and optional fields address, phone,
 *    website URL.
 * 4. Validates the returned grocery store attributes including id, createdAt,
 *    updatedAt.
 * 5. All fields adhere exactly to DTO types and formats.
 * 6. Proper async/await and typia assertions ensure runtime type safety.
 */

export async function test_api_grocery_store_creation_successful(
  connection: api.IConnection,
) {
  // Moderator signs up
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64); // Simulate a 64-char hash
  const username = RandomGenerator.name(1);

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: passwordHash,
        username,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "Moderator has valid UUID id",
    /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(moderator.id),
  );
  TestValidator.equals(
    "Moderator email matches input",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "Moderator username matches input",
    moderator.username,
    username,
  );

  // Create a grocery store
  const storeName = RandomGenerator.name(2);
  const address = RandomGenerator.paragraph({ sentences: 3 });
  const phone = RandomGenerator.mobile();
  const websiteUrl = `https://${RandomGenerator.alphaNumeric(8)}.com`;

  const groceryStore: IRecipeSharingGroceryStore =
    await api.functional.recipeSharing.moderator.groceryStores.create(
      connection,
      {
        body: {
          name: storeName,
          address,
          phone,
          website_url: websiteUrl,
        } satisfies IRecipeSharingGroceryStore.ICreate,
      },
    );
  typia.assert(groceryStore);

  // Validate returned grocery store data
  TestValidator.predicate(
    "Grocery store has valid UUID id",
    typeof groceryStore.id === "string" && groceryStore.id.length > 0,
  );
  TestValidator.equals(
    "Grocery store name matches input",
    groceryStore.name,
    storeName,
  );
  TestValidator.equals(
    "Grocery store address matches input",
    groceryStore.address,
    address,
  );
  TestValidator.equals(
    "Grocery store phone matches input",
    groceryStore.phone,
    phone,
  );
  TestValidator.equals(
    "Grocery store website_url matches input",
    groceryStore.website_url,
    websiteUrl,
  );

  TestValidator.predicate(
    "Grocery store has created_at datetime string",
    typeof groceryStore.created_at === "string" &&
      groceryStore.created_at.length > 0,
  );
  TestValidator.predicate(
    "Grocery store has updated_at datetime string",
    typeof groceryStore.updated_at === "string" &&
      groceryStore.updated_at.length > 0,
  );
}
