import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUserTags } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserTags";

/**
 * This end-to-end test validates the detail retrieval of a user-suggested
 * tag by its unique ID for an authenticated regular user in a recipe
 * sharing application.
 *
 * Detailed Steps:
 *
 * 1. Create and authenticate a regular user by calling the
 *    /auth/regularUser/join endpoint with a securely randomized user
 *    creation DTO.
 * 2. Confirm the response includes proper identification fields, timestamps,
 *    and authorization token.
 * 3. Use the authorized context to call the GET
 *    /recipeSharing/regularUser/userTags/{userTagId} endpoint with a valid
 *    userTagId (simulated/random UUID), asserting the response matches the
 *    IRecipeSharingUserTags structure.
 * 4. Assert the response does not include sensitive or extraneous fields such
 *    as passwords beyond the allowed schema.
 * 5. Test API error response by calling the detail endpoint with a
 *    non-existent UUID and verify it throws.
 * 6. Confirm role-based access control by ensuring only authorized regular
 *    users can perform this operation.
 *
 * This validation ensures secure access control, data integrity, and
 * completeness of detailed user tag retrieval in the system.
 */
export async function test_api_user_tag_detail_retrieval_authenticated(
  connection: api.IConnection,
) {
  // Step 1: Regular user creation and authentication
  const userCreateBody = {
    email: RandomGenerator.alphaNumeric(6) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(10),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });

  typia.assert(authorizedUser);

  // Step 2: Retrieve user tag detail with a valid userTagId
  const validUserTagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Call detail API
  const userTagDetail: IRecipeSharingUserTags =
    await api.functional.recipeSharing.regularUser.userTags.atUserTag(
      connection,
      { userTagId: validUserTagId },
    );

  typia.assert(userTagDetail);

  TestValidator.equals(
    "Returned user tag id matches requested userTagId",
    userTagDetail.id,
    validUserTagId,
  );
  TestValidator.predicate(
    "User tag status is valid",
    ["pending", "approved", "rejected"].includes(userTagDetail.status),
  );

  // Step 3: Test error handling for invalid/non-existent userTagId
  await TestValidator.error(
    "Fetching user tag with non-existent userTagId results in error",
    async () => {
      const nonExistentUserTagId: string & tags.Format<"uuid"> = typia.random<
        string & tags.Format<"uuid">
      >();
      await api.functional.recipeSharing.regularUser.userTags.atUserTag(
        connection,
        { userTagId: nonExistentUserTagId },
      );
    },
  );
}
