import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingCategoryApprovals } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCategoryApprovals";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * E2E test function to validate deletion of a user-submitted category approval
 * record by a moderator. This test covers authentication and authorization
 * enforcement by verifying that only authenticated moderators can perform
 * deletions.
 *
 * Workflow:
 *
 * 1. Create and authenticate a moderator user
 * 2. Create and authenticate a regular user
 * 3. Submit a category approval request with regular user credentials
 * 4. Verify unauthorized deletion attempts by unauthenticated and regular user
 *    connections fail
 * 5. Successfully delete category approval by moderator user
 * 6. Confirm that subsequent deletion attempts on the same record fail
 */
export async function test_api_category_approval_delete_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator join and authenticate
  const moderatorEmail = `mod${RandomGenerator.alphaNumeric(6)}@example.com`;
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(32);
  const moderatorUsername = `moduser${RandomGenerator.alphaNumeric(4)}`;
  const moderatorJoined: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
        username: moderatorUsername,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderatorJoined);

  const moderatorLoggedIn: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPasswordHash,
      } satisfies IRecipeSharingModerator.ILogin,
    });
  typia.assert(moderatorLoggedIn);

  // Prepare moderator connection with auth headers
  const moderatorConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${moderatorLoggedIn.token.access}`,
    },
  };

  // 2. Regular user join and authenticate
  const userEmail = `user${RandomGenerator.alphaNumeric(6)}@example.com`;
  const userPasswordHash = RandomGenerator.alphaNumeric(32);
  const userUsername = `user${RandomGenerator.alphaNumeric(4)}`;
  const userJoined: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: userEmail,
        password_hash: userPasswordHash,
        username: userUsername,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(userJoined);

  const userLoggedIn: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: {
        email: userEmail,
        password_hash: userPasswordHash,
      } satisfies IRecipeSharingRegularUser.ILogin,
    });
  typia.assert(userLoggedIn);

  // Prepare regular user connection with auth headers
  const userConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${userLoggedIn.token.access}`,
    },
  };

  // 3. Regular user submits a category approval
  const categoryApprovalSubmitted: IRecipeSharingCategoryApprovals =
    await api.functional.recipeSharing.regularUser.categoryApprovals.create(
      userConnection,
      {
        body: {
          submitted_by_user_id: userLoggedIn.id,
          tag_id: null,
          suggested_name: `Category_${RandomGenerator.alphaNumeric(6)}`,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        } satisfies IRecipeSharingCategoryApprovals.ICreate,
      },
    );
  typia.assert(categoryApprovalSubmitted);

  // 4. Attempt deletion by unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated delete category approval should fail",
    async () => {
      await api.functional.recipeSharing.moderator.categoryApprovals.erase(
        unauthenticatedConnection,
        {
          id: categoryApprovalSubmitted.id,
        },
      );
    },
  );

  // 5. Attempt deletion by regular user connection (should fail)
  await TestValidator.error(
    "regular user cannot delete category approval",
    async () => {
      await api.functional.recipeSharing.moderator.categoryApprovals.erase(
        userConnection,
        {
          id: categoryApprovalSubmitted.id,
        },
      );
    },
  );

  // 6. Moderator deletes the category approval successfully
  await api.functional.recipeSharing.moderator.categoryApprovals.erase(
    moderatorConnection,
    {
      id: categoryApprovalSubmitted.id,
    },
  );

  // 7. Confirm deletion: second delete attempt should produce error
  await TestValidator.error(
    "deleting already deleted category approval should fail",
    async () => {
      await api.functional.recipeSharing.moderator.categoryApprovals.erase(
        moderatorConnection,
        {
          id: categoryApprovalSubmitted.id,
        },
      );
    },
  );
}
