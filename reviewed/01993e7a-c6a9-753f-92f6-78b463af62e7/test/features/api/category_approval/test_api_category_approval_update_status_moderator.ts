import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingCategoryApprovals } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCategoryApprovals";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test updating the approval status and details of a specific category approval
 * request.
 *
 * Setup includes creating a moderator user for authentication, creating a user
 * category approval via /recipeSharing/regularUser/categoryApprovals.
 *
 * The test performs a PUT request with the category approval ID, updating the
 * status to 'approved', optionally providing review timestamp and category
 * name.
 *
 * Validates that the moderator role user can update the status, that the system
 * returns the updated approval entity with new status and review metadata.
 *
 * Also includes negative tests for unauthorized users or invalid IDs.
 *
 * Ensures adherence to approval status enum values (pending, approved,
 * rejected).
 */
export async function test_api_category_approval_update_status_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator user creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorUsername = RandomGenerator.name(2);
  const moderator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPassword,
        username: moderatorUsername,
      } satisfies IRecipeSharingModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Regular user creation
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userUsername = RandomGenerator.name(2);
  const regularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email: userEmail,
        password_hash: userPassword,
        username: userUsername,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 3. Regular user creates category approval request
  const rawNow = new Date();
  const submittedAtISOString = rawNow.toISOString();
  const categoryName = RandomGenerator.name(1);
  const categoryApprovalCreated: IRecipeSharingCategoryApprovals =
    await api.functional.recipeSharing.regularUser.categoryApprovals.create(
      connection,
      {
        body: {
          submitted_by_user_id: regularUser.id,
          status: "pending",
          created_at: submittedAtISOString,
          updated_at: submittedAtISOString,
          deleted_at: null,
          // category_name is not in ICreate schema, so do NOT include
        } satisfies IRecipeSharingCategoryApprovals.ICreate,
      },
    );
  typia.assert(categoryApprovalCreated);

  // 4. Authenticate as moderator user
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password_hash: moderatorPassword,
    } satisfies IRecipeSharingModerator.ILogin,
  });

  // 5. Update category approval status to 'approved' with review timestamp
  const updateBody: IRecipeSharingCategoryApprovals.IUpdate = {
    approval_status: "approved",
    reviewed_at: new Date().toISOString(),
    category_name: categoryName,
  };

  const updatedCategoryApproval: IRecipeSharingCategoryApprovals =
    await api.functional.recipeSharing.moderator.categoryApprovals.update(
      connection,
      {
        id: categoryApprovalCreated.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCategoryApproval);

  // Assert the update results
  TestValidator.equals(
    "Category Approval ID matches after update",
    updatedCategoryApproval.id,
    categoryApprovalCreated.id,
  );
  TestValidator.equals(
    "Category Approval status is updated to approved",
    updatedCategoryApproval.approval_status,
    "approved",
  );
  TestValidator.equals(
    "Category Approval category name is updated",
    updatedCategoryApproval.category_name,
    categoryName,
  );
  TestValidator.predicate(
    "Category Approval reviewed_at is set",
    updatedCategoryApproval.reviewed_at !== null &&
      updatedCategoryApproval.reviewed_at !== undefined,
  );

  // 6. Negative test: Attempt update with unauthorized user (regular user)
  await api.functional.auth.regularUser.login(connection, {
    body: {
      email: userEmail,
      password_hash: userPassword,
    } satisfies IRecipeSharingRegularUser.ILogin,
  });

  await TestValidator.error(
    "Regular user cannot update category approval",
    async () => {
      await api.functional.recipeSharing.moderator.categoryApprovals.update(
        connection,
        {
          id: categoryApprovalCreated.id,
          body: {
            approval_status: "rejected",
          } satisfies IRecipeSharingCategoryApprovals.IUpdate,
        },
      );
    },
  );

  // 7. Negative test: Update with invalid category approval ID
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password_hash: moderatorPassword,
    } satisfies IRecipeSharingModerator.ILogin,
  });

  await TestValidator.error(
    "Update fails with invalid category approval ID",
    async () => {
      await api.functional.recipeSharing.moderator.categoryApprovals.update(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
          body: {
            approval_status: "approved",
          } satisfies IRecipeSharingCategoryApprovals.IUpdate,
        },
      );
    },
  );
}
