import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUserTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserTags";

/**
 * Test updating an existing user-suggested tag by its tagId.
 *
 * This test performs the following steps:
 *
 * 1. Creates a regular user account via /auth/regularUser/join and establishes
 *    authentication context.
 * 2. Creates a user tag suggestion with status 'pending' via
 *    /recipeSharing/regularUser/userTags.
 * 3. Updates the created user tag suggestion's status to 'approved' and
 *    modifies the suggested_name via PUT
 *    /recipeSharing/regularUser/userTags/{tagId}.
 * 4. Validates the updated properties are correctly returned.
 * 5. Attempts an unauthorized update and confirms it is rejected.
 *
 * All API calls use proper DTOs with exact properties, authenticates with
 * SDK-managed tokens, and perform strict type validation on responses.
 */
export async function test_api_user_tag_update_regularuser_success(
  connection: api.IConnection,
) {
  // 1. Regular user account creation and authentication
  const userCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser = await api.functional.auth.regularUser.join(
    connection,
    { body: userCreateBody },
  );
  typia.assert(authorizedUser);

  // 2. Create initial user tag suggestion with status 'pending'
  const userTagCreateBody = {
    user_id: authorizedUser.id,
    tag_id: null,
    suggested_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "pending" as const,
  } satisfies IRecipeSharingUserTags.ICreate;

  const createdUserTag =
    await api.functional.recipeSharing.regularUser.userTags.create(connection, {
      body: userTagCreateBody,
    });
  typia.assert(createdUserTag);

  // 3. Update user tag suggestion
  const updateBody = {
    suggested_name: createdUserTag.suggested_name + " updated",
    status: "approved" as const,
  } satisfies IRecipeSharingUserTags.IUpdate;

  const updatedUserTag =
    await api.functional.recipeSharing.regularUser.userTags.updateUserTag(
      connection,
      {
        tagId: createdUserTag.id,
        body: updateBody,
      },
    );
  typia.assert(updatedUserTag);
  TestValidator.equals(
    "updated tag id matches created tag id",
    updatedUserTag.id,
    createdUserTag.id,
  );
  TestValidator.equals(
    "updated tag suggested_name is changed",
    updatedUserTag.suggested_name,
    updateBody.suggested_name,
  );
  TestValidator.equals(
    "updated tag status is approved",
    updatedUserTag.status,
    "approved",
  );

  // 4. Unauthorized update attempt
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized update should be rejected",
    async () => {
      await api.functional.recipeSharing.regularUser.userTags.updateUserTag(
        unauthorizedConnection,
        {
          tagId: createdUserTag.id,
          body: {
            status: "rejected",
          } satisfies IRecipeSharingUserTags.IUpdate,
        },
      );
    },
  );
}
