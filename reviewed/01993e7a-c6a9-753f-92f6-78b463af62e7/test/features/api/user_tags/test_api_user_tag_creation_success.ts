import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUserTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserTags";

/**
 * Test suite to validate successful creation of user-suggested tags by a
 * regular authenticated user.
 *
 * This test covers the full creation flow including:
 *
 * 1. Creating a new regular user account to obtain authentication context.
 * 2. Using the authenticated user to submit a new user tag suggestion with
 *    status 'pending'.
 * 3. Validating the returned user tag entity for correctness, including id,
 *    timestamps, and status.
 * 4. Attempting to create a duplicate user tag suggestion with the same
 *    suggested_name and user_id to ensure the API properly rejects
 *    duplicates.
 *
 * All API calls are validated with typia.assert to enforce strict type
 * safety and schema adherence. Random generators produce valid emails,
 * usernames, and tag names consistent with business rules.
 */
export async function test_api_user_tag_creation_success(
  connection: api.IConnection,
) {
  // 1. Create a regular user account
  const userCreatePayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const createdUser = await api.functional.auth.regularUser.join(connection, {
    body: userCreatePayload,
  });
  typia.assert(createdUser);

  // 2. Create a new user tag suggestion
  const suggestedName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });
  const userTagCreatePayload = {
    user_id: createdUser.id,
    suggested_name: suggestedName,
    status: "pending",
  } satisfies IRecipeSharingUserTags.ICreate;

  const createdUserTag =
    await api.functional.recipeSharing.regularUser.userTags.create(connection, {
      body: userTagCreatePayload,
    });
  typia.assert(createdUserTag);
  TestValidator.equals(
    "user_id matches the creator",
    createdUserTag.user_id,
    createdUser.id,
  );
  TestValidator.equals(
    "suggested_name matches requested",
    createdUserTag.suggested_name,
    suggestedName,
  );
  TestValidator.equals("status is pending", createdUserTag.status, "pending");
  TestValidator.predicate(
    "id is non-empty string",
    typeof createdUserTag.id === "string" && createdUserTag.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time format",
    !isNaN(Date.parse(createdUserTag.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    !isNaN(Date.parse(createdUserTag.updated_at)),
  );

  // 3. Attempt to create duplicate user tag suggestion (same user_id and suggested_name)
  await TestValidator.error(
    "duplicate user tag suggestion should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.userTags.create(
        connection,
        {
          body: {
            user_id: createdUser.id,
            suggested_name: suggestedName,
            status: "pending",
          } satisfies IRecipeSharingUserTags.ICreate,
        },
      );
    },
  );
}
