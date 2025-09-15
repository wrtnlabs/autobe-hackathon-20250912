import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingFlagQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingFlagQueue";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Test updating a flag queue entry with moderator authentication, covering
 * successful update with valid data, permission checks, and invalid ID
 * handling. The update includes modifying the flag reason, status, reviewed
 * review ID, and timestamps to reflect moderation progress. The test verifies
 * the update propagates correctly and that unauthorized users cannot perform
 * the update.
 */
export async function test_api_flag_queue_update_moderator_authorized(
  connection: api.IConnection,
) {
  // 1. Moderator joins and obtains authorization
  const moderatorCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingModerator.ICreate;

  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderator);

  // 2. Prepare update data for a flag queue
  // Use valid status values as string literals according to description
  const validStatuses = [
    "pending",
    "in_review",
    "resolved",
    "dismissed",
  ] as const;
  const now = new Date();
  const createdAt = now.toISOString();
  const updatedAt = new Date(now.getTime() + 60000).toISOString();
  const deletedAt = null;
  const newFlagReason = RandomGenerator.paragraph({ sentences: 5 });
  const newStatus = RandomGenerator.pick(validStatuses);
  const newReviewId = typia.random<string & tags.Format<"uuid">>();

  const updateBody = {
    flag_reason: newFlagReason,
    status: newStatus,
    recipe_sharing_review_id: newReviewId,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: deletedAt,
  } satisfies IRecipeSharingFlagQueue.IUpdate;

  // For testing, create a random UUID for the flag queue ID to update
  const flagQueueId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt a valid update to the flag queue entry
  const updatedFlagQueue: IRecipeSharingFlagQueue =
    await api.functional.recipeSharing.moderator.flagQueues.update(connection, {
      id: flagQueueId,
      body: updateBody,
    });
  typia.assert(updatedFlagQueue);

  TestValidator.equals(
    "updated flag_reason should match",
    updatedFlagQueue.flag_reason,
    newFlagReason,
  );
  TestValidator.equals(
    "updated status should match",
    updatedFlagQueue.status,
    newStatus,
  );
  TestValidator.equals(
    "updated recipe_sharing_review_id should match",
    updatedFlagQueue.recipe_sharing_review_id,
    newReviewId,
  );
  TestValidator.equals(
    "updated created_at should match",
    updatedFlagQueue.created_at,
    createdAt,
  );
  TestValidator.equals(
    "updated updated_at should match",
    updatedFlagQueue.updated_at,
    updatedAt,
  );
  TestValidator.equals(
    "updated deleted_at should be null",
    updatedFlagQueue.deleted_at,
    deletedAt,
  );

  // 4. Test error on invalid flag queue ID (update with non-existing ID)
  const invalidFlagQueueId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update with invalid flagQueueId should fail",
    async () => {
      await api.functional.recipeSharing.moderator.flagQueues.update(
        connection,
        {
          id: invalidFlagQueueId,
          body: updateBody,
        },
      );
    },
  );

  // 5. Test error when non-authorized user tries to update
  // Create an unauthenticated connection: clone connection but clear headers
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot update flag queue",
    async () => {
      await api.functional.recipeSharing.moderator.flagQueues.update(
        unauthenticatedConn,
        {
          id: flagQueueId,
          body: updateBody,
        },
      );
    },
  );
}
