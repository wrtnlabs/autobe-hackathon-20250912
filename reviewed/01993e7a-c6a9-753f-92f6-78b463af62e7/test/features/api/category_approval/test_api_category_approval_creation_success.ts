import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingCategoryApprovals } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingCategoryApprovals";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test the successful creation of a category approval request by a regular
 * user.
 *
 * This test covers the end-to-end workflow including user registration via
 * /auth/regularUser/join to obtain authentication tokens, then submitting a
 * category approval with valid category_name and initial status 'pending'.
 *
 * The scenario validates the server accepts the unique category name, stores
 * the submitted_by_user_id from authenticated user context, and creates a
 * record with proper timestamps.
 *
 * The expected result is a successful API response containing the created
 * category approval entity with all required fields populated and status set to
 * 'pending'.
 */
export async function test_api_category_approval_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new regular user via /auth/regularUser/join
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // Current time in ISO format
  const nowISOString = new Date().toISOString();

  // 2. Prepare category approval creation data with unique category name
  const categoryApprovalCreateBody = {
    submitted_by_user_id: authorizedUser.id,
    tag_id: null,
    suggested_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    status: "pending",
    created_at: nowISOString,
    updated_at: nowISOString,
    deleted_at: null,
  } satisfies IRecipeSharingCategoryApprovals.ICreate;

  // 3. Create category approval
  const createdCategoryApproval: IRecipeSharingCategoryApprovals =
    await api.functional.recipeSharing.regularUser.categoryApprovals.create(
      connection,
      {
        body: categoryApprovalCreateBody,
      },
    );
  typia.assert(createdCategoryApproval);

  // 4. Validations
  TestValidator.equals(
    "submitted_by_user_id matches authorized user",
    createdCategoryApproval.submitted_by_user_id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "category_name matches suggested_name input",
    createdCategoryApproval.category_name,
    categoryApprovalCreateBody.suggested_name!,
  );
  TestValidator.equals(
    "approval_status is 'pending'",
    createdCategoryApproval.approval_status,
    "pending",
  );

  // Timestamps are non-empty strings
  TestValidator.predicate(
    "created_at is ISO datetime string",
    typeof createdCategoryApproval.created_at === "string" &&
      createdCategoryApproval.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO datetime string",
    typeof createdCategoryApproval.updated_at === "string" &&
      createdCategoryApproval.updated_at.length > 0,
  );

  // submitted_at should equal created_at
  TestValidator.equals(
    "submitted_at is equal to created_at",
    createdCategoryApproval.submitted_at,
    createdCategoryApproval.created_at,
  );

  // Optional nullable fields checked safely
  if (createdCategoryApproval.reviewed_at !== undefined) {
    TestValidator.predicate(
      "reviewed_at is null or a string",
      createdCategoryApproval.reviewed_at === null ||
        typeof createdCategoryApproval.reviewed_at === "string",
    );
  }
  if (createdCategoryApproval.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is null or a string",
      createdCategoryApproval.deleted_at === null ||
        typeof createdCategoryApproval.deleted_at === "string",
    );
  }
}
