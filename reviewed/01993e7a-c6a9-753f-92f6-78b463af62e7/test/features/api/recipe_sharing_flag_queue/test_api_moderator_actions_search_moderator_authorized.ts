import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingFlagQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingFlagQueue";
import type { IRecipeSharingFlagQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingFlagQueue";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Test searching moderator actions with filtering and pagination, ensuring
 * moderator authentication.
 *
 * This E2E test includes role-specific authentication via moderator join
 * API. It covers multiple filter scenarios including no filters, by
 * moderator ID, action type (flag_reason), target ID, and date filters.
 * Verifies correct pagination metadata and response consistency. Confirms
 * search endpoint rejects unauthenticated calls.
 */
export async function test_api_moderator_actions_search_moderator_authorized(
  connection: api.IConnection,
) {
  // 1. Moderator user creation and authentication
  const moderatorCreateBody = {
    email: `moderator${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;

  const moderatorAuthorized = await api.functional.auth.moderator.join(
    connection,
    { body: moderatorCreateBody },
  );
  typia.assert(moderatorAuthorized);

  // 2. Search with empty filters to retrieve all
  const initialSearchResponse =
    await api.functional.recipeSharing.moderator.moderatorActions.index(
      connection,
      { body: {} satisfies IRecipeSharingFlagQueue.IRequest },
    );
  typia.assert(initialSearchResponse);

  TestValidator.predicate(
    "empty filter returns list with pagination",
    Array.isArray(initialSearchResponse.data) &&
      typeof initialSearchResponse.pagination === "object" &&
      initialSearchResponse.pagination.current >= 0 &&
      initialSearchResponse.pagination.limit > 0,
  );

  // 3. Filter by moderator ID - use reported_by_user_id as proxy
  if (initialSearchResponse.data.length > 0) {
    const targetModeratorId = initialSearchResponse.data[0].reported_by_user_id;
    typia.assert(targetModeratorId);

    const filteredByModeratorId =
      await api.functional.recipeSharing.moderator.moderatorActions.index(
        connection,
        {
          body: {
            reported_by_user_id: targetModeratorId,
          } satisfies IRecipeSharingFlagQueue.IRequest,
        },
      );
    typia.assert(filteredByModeratorId);

    // All entries should have the same reported_by_user_id as filter
    TestValidator.predicate(
      "all filtered by moderator ID",
      filteredByModeratorId.data.every(
        (entry) => entry.reported_by_user_id === targetModeratorId,
      ),
    );
  }

  // 4. Filter by action type (flag_reason) - pick one from initial data if possible
  const sampleFlagReason =
    initialSearchResponse.data.length > 0
      ? initialSearchResponse.data[0].flag_reason
      : null;
  if (sampleFlagReason) {
    const filteredByActionType =
      await api.functional.recipeSharing.moderator.moderatorActions.index(
        connection,
        {
          body: {
            flag_reason: sampleFlagReason,
          } satisfies IRecipeSharingFlagQueue.IRequest,
        },
      );
    typia.assert(filteredByActionType);
    TestValidator.predicate(
      "filter by flag_reason returns matching entries",
      filteredByActionType.data.every(
        (entry) => entry.flag_reason === sampleFlagReason,
      ),
    );
  }

  // 5. Filter by target ID (recipe_sharing_review_id)
  const sampleTargetId = initialSearchResponse.data.find(
    (entry) =>
      entry.recipe_sharing_review_id !== null &&
      entry.recipe_sharing_review_id !== undefined,
  )?.recipe_sharing_review_id;
  if (sampleTargetId) {
    const filteredByTargetId =
      await api.functional.recipeSharing.moderator.moderatorActions.index(
        connection,
        {
          body: {
            recipe_sharing_review_id: sampleTargetId,
          } satisfies IRecipeSharingFlagQueue.IRequest,
        },
      );
    typia.assert(filteredByTargetId);
    TestValidator.predicate(
      "filter by recipe_sharing_review_id returns matching entries",
      filteredByTargetId.data.every(
        (entry) => entry.recipe_sharing_review_id === sampleTargetId,
      ),
    );
  }

  // 6. Filter by created_at date range (from, to)
  if (initialSearchResponse.data.length > 0) {
    const earliestCreatedAt = initialSearchResponse.data.reduce(
      (earliest, entry) =>
        entry.created_at && entry.created_at < earliest
          ? entry.created_at
          : earliest,
      initialSearchResponse.data[0].created_at ?? new Date().toISOString(),
    );
    const latestCreatedAt = initialSearchResponse.data.reduce(
      (latest, entry) =>
        entry.created_at && entry.created_at > latest
          ? entry.created_at
          : latest,
      initialSearchResponse.data[0].created_at ?? new Date().toISOString(),
    );

    const filteredByDateRange =
      await api.functional.recipeSharing.moderator.moderatorActions.index(
        connection,
        {
          body: {
            created_at_from: earliestCreatedAt,
            created_at_to: latestCreatedAt,
          } satisfies IRecipeSharingFlagQueue.IRequest,
        },
      );
    typia.assert(filteredByDateRange);

    TestValidator.predicate(
      "filter by created_at date range filters correctly",
      filteredByDateRange.data.every(
        (entry) =>
          entry.created_at >= earliestCreatedAt &&
          entry.created_at <= latestCreatedAt,
      ),
    );
  }

  // 7. Test unauthorized access fails (using fresh connection without moderator login)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized access to moderatorActions search fails",
    async () => {
      await api.functional.recipeSharing.moderator.moderatorActions.index(
        unauthenticatedConnection,
        { body: {} satisfies IRecipeSharingFlagQueue.IRequest },
      );
    },
  );
}
