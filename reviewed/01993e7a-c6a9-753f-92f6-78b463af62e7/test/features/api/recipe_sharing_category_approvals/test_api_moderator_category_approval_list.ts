import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingCategoryApprovals } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingCategoryApprovals";
import type { IRecipeSharingCategoryApprovals } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCategoryApprovals";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * Validate the listing of user-submitted category approval requests for
 * moderator review.
 *
 * This test covers:
 *
 * - Moderator user creation and authentication.
 * - Retrieving paginated category approvals with filters for approval status
 *   and category name.
 * - Validation of pagination properties and response structure.
 * - Permission enforcement by testing access denial when unauthenticated.
 *
 * Steps:
 *
 * 1. Create a new moderator using the join endpoint.
 * 2. Login as the moderator.
 * 3. Call the category approvals listing endpoint with approval_status filter
 *    'pending' and partial category name substring.
 * 4. Validate that the response contains correct paginated data and fields.
 * 5. Call the listing endpoint with empty filter to check default pagination.
 * 6. Verify pagination fields are correct.
 * 7. Test that an unauthenticated connection is denied access with an error.
 */
export async function test_api_moderator_category_approval_list(
  connection: api.IConnection,
) {
  // 1. Moderator sign up
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const createBody = {
    email: moderatorEmail,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingModerator.ICreate;
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: createBody });
  typia.assert(moderator);

  // 2. Moderator login
  const loginBody = {
    email: moderatorEmail,
    password_hash: createBody.password_hash,
  } satisfies IRecipeSharingModerator.ILogin;
  const moderatorLogin: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, { body: loginBody });
  typia.assert(moderatorLogin);

  // 3. Search category approvals with filter by approval_status and partial category name
  const partialCategoryName = RandomGenerator.substring(
    RandomGenerator.name(3),
  );
  const searchFilter1: IRecipeSharingCategoryApprovals.IRequest = {
    approval_status: "pending",
    category_name: partialCategoryName,
  };

  const searchResult1: IPageIRecipeSharingCategoryApprovals.ISummary =
    await api.functional.recipeSharing.moderator.categoryApprovals.index(
      connection,
      { body: searchFilter1 },
    );
  typia.assert(searchResult1);

  // Validate pagination exists and properties
  TestValidator.predicate(
    "pagination object exists",
    searchResult1.pagination !== null && searchResult1.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(searchResult1.data),
  );

  // If data is not empty, check properties
  if (searchResult1.data.length > 0) {
    for (const item of searchResult1.data) {
      TestValidator.predicate(
        "id is uuid",
        typeof item.id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            item.id,
          ),
      );
      TestValidator.predicate(
        "submitted_by_user_id is uuid",
        typeof item.submitted_by_user_id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            item.submitted_by_user_id,
          ),
      );
      TestValidator.predicate(
        "category_name is string",
        typeof item.category_name === "string",
      );
      TestValidator.equals(
        "approval_status is 'pending'",
        item.approval_status,
        "pending",
      );
      TestValidator.predicate(
        "submitted_at is string",
        typeof item.submitted_at === "string",
      );
      if (item.reviewed_at !== null && item.reviewed_at !== undefined) {
        TestValidator.predicate(
          "reviewed_at is string or null",
          typeof item.reviewed_at === "string",
        );
      }
      TestValidator.predicate(
        "created_at is string",
        typeof item.created_at === "string",
      );
      TestValidator.predicate(
        "updated_at is string",
        typeof item.updated_at === "string",
      );

      TestValidator.predicate(
        "category_name contains partial filter",
        item.category_name.includes(partialCategoryName),
      );
    }
  }

  // 4. Search category approvals with empty filter (should return paged list or empty)
  const searchFilter2: IRecipeSharingCategoryApprovals.IRequest = {};
  const searchResult2: IPageIRecipeSharingCategoryApprovals.ISummary =
    await api.functional.recipeSharing.moderator.categoryApprovals.index(
      connection,
      { body: searchFilter2 },
    );
  typia.assert(searchResult2);

  // Validate pagination properties
  const p = searchResult2.pagination;
  TestValidator.predicate(
    "pagination current is number >= 0",
    typeof p.current === "number" && p.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is number >= 0",
    typeof p.limit === "number" && p.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is number >= 0",
    typeof p.records === "number" && p.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is number >= 0",
    typeof p.pages === "number" && p.pages >= 0,
  );

  // 5. Test unauthorized access rejection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access denied", async () => {
    await api.functional.recipeSharing.moderator.categoryApprovals.index(
      unauthConn,
      { body: searchFilter1 },
    );
  });
}
