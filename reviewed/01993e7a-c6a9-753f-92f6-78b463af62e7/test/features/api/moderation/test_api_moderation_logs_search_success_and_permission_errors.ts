import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingModerationLog";
import type { IRecipeSharingModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerationLog";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Comprehensive test verifying moderation log search.
 *
 * 1. Moderator sign-up and authentication.
 * 2. Searching moderation logs with various filters (by review ID, moderator ID,
 *    action).
 * 3. Pagination and limit validation.
 * 4. Unauthorized access testing by non-moderator user.
 *
 * Each step ensures the API respects role permissions and returns data that
 * matches filtering criteria and pagination rules.
 */
export async function test_api_moderation_logs_search_success_and_permission_errors(
  connection: api.IConnection,
) {
  // 1. Moderator sign-up
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCreateBody = {
    email: moderatorEmail,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;

  const moderatorUser: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(moderatorUser);

  // Use the Authorization token attached to connection.headers automatically by SDK

  // 2. Search moderation logs without filters (fetch all or first page)
  {
    const searchBody1: IRecipeSharingModerationLog.IRequest = {
      page: 1,
      limit: 5,
    };
    const result1: IPageIRecipeSharingModerationLog =
      await api.functional.recipeSharing.moderator.moderation.logs.index(
        connection,
        { body: searchBody1 },
      );
    typia.assert(result1);
    TestValidator.predicate(
      "pagination limits respected",
      result1.pagination.limit <= 5 && result1.data.length <= 5,
    );
    TestValidator.equals("current page is 1", result1.pagination.current, 1);
  }

  // 3. Search logs filtered by moderator ID
  {
    const searchBody2: IRecipeSharingModerationLog.IRequest = {
      recipe_sharing_moderator_id: moderatorUser.id,
      page: 1,
      limit: 3,
    };
    const result2: IPageIRecipeSharingModerationLog =
      await api.functional.recipeSharing.moderator.moderation.logs.index(
        connection,
        { body: searchBody2 },
      );
    typia.assert(result2);
    // Validate that all logs have the specified moderator ID
    TestValidator.predicate(
      "all logs have correct moderator ID",
      result2.data.every(
        (log) => log.recipe_sharing_moderator_id === moderatorUser.id,
      ),
    );
    TestValidator.predicate(
      "pagination limits respected",
      result2.pagination.limit <= 3 && result2.data.length <= 3,
    );
  }

  // 4. Search logs filtered by action (e.g., "hide") - sample an action string
  {
    const sampleAction = "hide";
    const searchBody3: IRecipeSharingModerationLog.IRequest = {
      action: sampleAction,
      page: 1,
      limit: 3,
    };
    const result3: IPageIRecipeSharingModerationLog =
      await api.functional.recipeSharing.moderator.moderation.logs.index(
        connection,
        { body: searchBody3 },
      );
    typia.assert(result3);
    TestValidator.predicate(
      "all logs have the specified action",
      result3.data.every((log) => log.action === sampleAction),
    );
  }

  // 5. Search logs with pagination: page 2
  {
    const searchBody4: IRecipeSharingModerationLog.IRequest = {
      page: 2,
      limit: 3,
    };
    const result4: IPageIRecipeSharingModerationLog =
      await api.functional.recipeSharing.moderator.moderation.logs.index(
        connection,
        { body: searchBody4 },
      );
    typia.assert(result4);
    TestValidator.predicate(
      "pagination page 2 data validity",
      result4.pagination.current === 2 || result4.data.length === 0,
    );
  }

  // 6. Unauthorized access test: Join a non-moderator user and try search
  {
    // Create a non-moderator user (simulate by using new connection without token)
    const newConnection: api.IConnection = { ...connection, headers: {} };

    const searchBodyUnauthorized: IRecipeSharingModerationLog.IRequest = {
      page: 1,
      limit: 1,
    };

    await TestValidator.error("unauthorized access denied", async () => {
      await api.functional.recipeSharing.moderator.moderation.logs.index(
        newConnection,
        { body: searchBodyUnauthorized },
      );
    });
  }
}
