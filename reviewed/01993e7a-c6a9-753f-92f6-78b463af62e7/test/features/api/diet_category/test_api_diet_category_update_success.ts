import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingDietCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDietCategory";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * This test verifies the successful update of a diet category by a
 * moderator. It covers the entire flow from moderator account creation,
 * diet category creation, to updating diet category fields with valid
 * values.
 *
 * Steps:
 *
 * 1. Create a moderator user and authenticate to establish moderator context.
 * 2. Create a diet category with unique code, name, and optional description.
 * 3. Update the diet category by changing code, name, and description.
 * 4. Assert that the updated category matches the input update fields.
 *
 * This covers only the success case ensuring update persistence and
 * authorization correctness.
 */
export async function test_api_diet_category_update_success(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator user
  const moderatorCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreateBody,
  });
  typia.assert(moderator);

  // Step 2: Create a diet category with the moderator context
  const originalDietCategoryCreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRecipeSharingDietCategory.ICreate;

  const createdDietCategory =
    await api.functional.recipeSharing.moderator.dietCategories.create(
      connection,
      {
        body: originalDietCategoryCreate,
      },
    );
  typia.assert(createdDietCategory);

  // Step 3: Prepare update data changing code, name, and description
  const updateData = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRecipeSharingDietCategory.IUpdate;

  // Step 4: Update the diet category
  const updatedDietCategory =
    await api.functional.recipeSharing.moderator.dietCategories.update(
      connection,
      {
        id: createdDietCategory.id,
        body: updateData,
      },
    );
  typia.assert(updatedDietCategory);

  // Step 5: Verify the updated entity matches update data
  TestValidator.equals(
    "diet category code should be updated",
    updatedDietCategory.code,
    updateData.code,
  );
  TestValidator.equals(
    "diet category name should be updated",
    updatedDietCategory.name,
    updateData.name,
  );
  TestValidator.equals(
    "diet category description should be updated",
    updatedDietCategory.description,
    updateData.description ?? null,
  );
}
