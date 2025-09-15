import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUserFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUserFollower";

/**
 * This E2E test verifies the successful creation of a follower relationship
 * between two regular users in the recipe sharing platform.
 *
 * The workflow is as follows:
 *
 * 1. Three prerequisite join operations are performed to create and authenticate
 *    three distinct regular users. These join operations ensure the
 *    'regularUser' role authorization context is properly established for
 *    subsequent API calls.
 * 2. Using the authenticated sessions of the first and second created users, a new
 *    follower relationship is created where the first user follows the second
 *    user.
 * 3. The response from the follower creation is validated to contain all required
 *    properties with correct data formats, including UUIDs and ISO 8601
 *    date-time strings.
 * 4. Additionally, business logic validations are performed to verify that:
 *
 *    - The follower_user_id matches the authenticated first user.
 *    - The followee_user_id matches the second user.
 *    - The timestamps for creation and update are valid date-time strings.
 * 5. This confirms the follower relationship is successfully persisted and the
 *    system behaves as expected.
 *
 * This test ensures critical social interaction features are working correctly,
 * including user authentication, authorization context establishment, and
 * follower relationship persistence with correct metadata.
 */
export async function test_api_user_follower_create_success(
  connection: api.IConnection,
) {
  // 1. Join first regular user
  const firstUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        username: RandomGenerator.name(2),
        password_hash: RandomGenerator.alphaNumeric(16),
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(firstUser);

  // 2. Join second regular user
  const secondUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        username: RandomGenerator.name(2),
        password_hash: RandomGenerator.alphaNumeric(16),
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(secondUser);

  // 3. Join third regular user (prerequisite from scenario)
  const thirdUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        username: RandomGenerator.name(2),
        password_hash: RandomGenerator.alphaNumeric(16),
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(thirdUser);

  // 4. Create follower relationship: firstUser follows secondUser
  const follower: IRecipeSharingUserFollower =
    await api.functional.recipeSharing.regularUser.userFollowers.create(
      connection,
      {
        body: {
          follower_user_id: firstUser.id,
          followee_user_id: secondUser.id,
        } satisfies IRecipeSharingUserFollower.ICreate,
      },
    );
  typia.assert(follower);

  // 5. Validate follower_user_id matches firstUser.id
  TestValidator.equals(
    "follower_user_id matches firstUser.id",
    follower.follower_user_id,
    firstUser.id,
  );

  // 6. Validate followee_user_id matches secondUser.id
  TestValidator.equals(
    "followee_user_id matches secondUser.id",
    follower.followee_user_id,
    secondUser.id,
  );

  // 7. Validate that id is a valid UUID
  TestValidator.predicate(
    "id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      follower.id,
    ),
  );

  // 8. Validate created_at and updated_at are non-empty ISO date-time strings
  TestValidator.predicate(
    "created_at is ISO date-time string",
    typeof follower.created_at === "string" && follower.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time string",
    typeof follower.updated_at === "string" && follower.updated_at.length > 0,
  );

  // 9. deleted_at should be null or undefined since new (not deleted)
  TestValidator.predicate(
    "deleted_at is null or undefined",
    follower.deleted_at === null || follower.deleted_at === undefined,
  );
}
