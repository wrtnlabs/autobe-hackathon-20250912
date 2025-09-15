import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * Test retrieval of detailed information for a specific workflow manager user.
 *
 * This test ensures that an authenticated workflowManager user can retrieve the
 * detailed profile of another workflowManager user by ID. It verifies proper
 * creation, authentication, and data consistency.
 *
 * Steps:
 *
 * 1. Create and authenticate a workflowManager user.
 * 2. Create a second workflowManager user to retrieve.
 * 3. Retrieve the second user details by ID as the first user.
 * 4. Compare all relevant fields except the authentication token.
 */
export async function test_api_workflow_manager_get_workflow_manager_detail_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate first workflowManager user
  const firstUserCreate = {
    email: `user1_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  const firstUserAuthorized: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: firstUserCreate,
    });
  typia.assert(firstUserAuthorized);

  // 2. Create second workflowManager user (for retrieval later)
  const secondUserCreate = {
    email: `user2_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  // Use a fresh connection for join to avoid overwriting first user's token
  const newConnectionForSecondUser: api.IConnection = {
    ...connection,
    headers: {},
  };

  const secondUserAuthorized: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(newConnectionForSecondUser, {
      body: secondUserCreate,
    });
  typia.assert(secondUserAuthorized);

  // 3. Retrieve the second user's details by ID using the original connection (authenticated as first user)
  const retrievedUser: INotificationWorkflowWorkflowManager =
    await api.functional.notificationWorkflow.workflowManager.workflowManagers.at(
      connection,
      {
        id: secondUserAuthorized.id,
      },
    );
  typia.assert(retrievedUser);

  // 4. Validate all fields except token
  TestValidator.equals(
    "retrieved user id equals second user id",
    retrievedUser.id,
    secondUserAuthorized.id,
  );
  TestValidator.equals(
    "retrieved user email equals second user email",
    retrievedUser.email,
    secondUserAuthorized.email,
  );
  TestValidator.equals(
    "retrieved user password hash equals second user password hash",
    retrievedUser.password_hash,
    secondUserAuthorized.password_hash,
  );

  // Compare created_at and updated_at as equal strings
  TestValidator.equals(
    "retrieved user created_at equals second user created_at",
    retrievedUser.created_at,
    secondUserAuthorized.created_at,
  );
  TestValidator.equals(
    "retrieved user updated_at equals second user updated_at",
    retrievedUser.updated_at,
    secondUserAuthorized.updated_at,
  );

  // deleted_at can be null or string - explicitly handle null comparison
  if (
    retrievedUser.deleted_at === null ||
    retrievedUser.deleted_at === undefined
  ) {
    TestValidator.predicate(
      "retrieved user deleted_at is null/undefined or equal",
      secondUserAuthorized.deleted_at === null ||
        secondUserAuthorized.deleted_at === undefined,
    );
  } else {
    TestValidator.equals(
      "retrieved user deleted_at equals second user deleted_at",
      retrievedUser.deleted_at,
      secondUserAuthorized.deleted_at ?? null,
    );
  }
}
