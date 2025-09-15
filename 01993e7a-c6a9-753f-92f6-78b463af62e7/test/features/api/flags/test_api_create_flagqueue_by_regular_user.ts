import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingFlagQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingFlagQueue";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * This test validates the complete workflow of creating a flag queue entry by a
 * regular user. It begins by registering a new regular user with a unique
 * email, username, and password hash, ensuring successful authentication. Using
 * the authenticated user context, it submits a flag queue creation request
 * specifying the review ID being flagged (nullable), the reporting user's ID,
 * flag reason, status, and timestamps for creation and update. The test asserts
 * that the returned flag queue entry matches the input data, validates the
 * response type strictly, and confirms that all operations are performed under
 * the proper authenticated user context. This workflow ensures the flagging
 * feature works end-to-end from user registration through flag queue creation
 * with valid, realistic data respecting all format and business rules.
 */
export async function test_api_create_flagqueue_by_regular_user(
  connection: api.IConnection,
) {
  // 1. Join a regular user
  const createUserBody = {
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser = await api.functional.auth.regularUser.join(
    connection,
    {
      body: createUserBody,
    },
  );
  typia.assert(authorizedUser);

  // 2. Create a flag queue entry by the new user
  const now = new Date().toISOString();

  const createFlagBody = {
    recipe_sharing_review_id: null,
    reported_by_user_id: authorizedUser.id,
    flag_reason: "Inappropriate content",
    status: "pending",
    created_at: now,
    updated_at: now,
    deleted_at: null,
  } satisfies IRecipeSharingFlagQueue.ICreate;

  const flagQueueEntry =
    await api.functional.recipeSharing.regularUser.flagQueues.create(
      connection,
      {
        body: createFlagBody,
      },
    );
  typia.assert(flagQueueEntry);

  TestValidator.equals(
    "flag queue reported_by_user_id matches",
    flagQueueEntry.reported_by_user_id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "flag queue flag_reason matches",
    flagQueueEntry.flag_reason,
    createFlagBody.flag_reason,
  );
  TestValidator.equals(
    "flag queue status matches",
    flagQueueEntry.status,
    createFlagBody.status,
  );
  TestValidator.equals(
    "flag queue recipe_sharing_review_id matches",
    flagQueueEntry.recipe_sharing_review_id,
    createFlagBody.recipe_sharing_review_id,
  );
  TestValidator.equals(
    "flag queue created_at matches",
    flagQueueEntry.created_at,
    createFlagBody.created_at,
  );
  TestValidator.equals(
    "flag queue updated_at matches",
    flagQueueEntry.updated_at,
    createFlagBody.updated_at,
  );
  TestValidator.equals(
    "flag queue deleted_at is null",
    flagQueueEntry.deleted_at,
    null,
  );
}
