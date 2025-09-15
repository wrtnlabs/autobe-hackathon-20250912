import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRecipeSharingDietCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDietCategories";

export async function test_api_diet_category_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. Success case: Retrieve an existing diet category by ID
  const existingDietCategoryId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  const dietCategory: IRecipeSharingDietCategories =
    await api.functional.recipeSharing.dietCategories.atDietCategory(
      connection,
      {
        id: existingDietCategoryId,
      },
    );
  typia.assert(dietCategory);

  // Validate description is string|null|undefined
  TestValidator.predicate(
    "diet category description is string or null or undefined",
    dietCategory.description === null ||
      dietCategory.description === undefined ||
      typeof dietCategory.description === "string",
  );

  // 2. Failure case: Retrieve with non-existent diet category ID
  const nonExistentDietCategoryId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "retrieve diet category with non-existent id should fail",
    async () => {
      await api.functional.recipeSharing.dietCategories.atDietCategory(
        connection,
        {
          id: nonExistentDietCategoryId,
        },
      );
    },
  );
}
