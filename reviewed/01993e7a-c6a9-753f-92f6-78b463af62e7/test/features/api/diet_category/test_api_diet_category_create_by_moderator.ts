import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingDietCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDietCategory";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

export async function test_api_diet_category_create_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create and authenticate moderator
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const username = RandomGenerator.name(2);

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
        username,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  const loggedIn: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email,
        password_hash: passwordHash,
      } satisfies IRecipeSharingModerator.ILogin,
    });
  typia.assert(loggedIn);

  // 2. Create diet category
  const code = RandomGenerator.alphabets(6).toLowerCase();
  const name = RandomGenerator.name(2);
  const description = RandomGenerator.paragraph({ sentences: 3 });

  const category: IRecipeSharingDietCategory =
    await api.functional.recipeSharing.moderator.dietCategories.create(
      connection,
      {
        body: {
          code,
          name,
          description,
        } satisfies IRecipeSharingDietCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Validate created category
  TestValidator.predicate(
    "category id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      category.id,
    ),
  );
  TestValidator.equals("code matches input", category.code, code);
  TestValidator.equals("name matches input", category.name, name);
  TestValidator.equals(
    "description matches input",
    category.description ?? null,
    description,
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof category.created_at === "string" && category.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof category.updated_at === "string" && category.updated_at.length > 0,
  );

  // 4. Duplicate category code creation must fail
  await TestValidator.error(
    "duplicate code creation throws error",
    async () => {
      await api.functional.recipeSharing.moderator.dietCategories.create(
        connection,
        {
          body: {
            code,
            name: RandomGenerator.name(2),
          } satisfies IRecipeSharingDietCategory.ICreate,
        },
      );
    },
  );
}
