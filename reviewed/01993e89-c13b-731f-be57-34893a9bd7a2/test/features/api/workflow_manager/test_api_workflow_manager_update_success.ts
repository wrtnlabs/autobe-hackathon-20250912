import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * Tests the complete workflow of updating a workflow manager user's email.
 *
 * This test verifies the entire lifecycle of a workflow manager user from
 * creation (join), authentication (login), updating user email, and validating
 * the updated data. It also validates the failure case when attempting an
 * update without proper authentication.
 *
 * Steps:
 *
 * 1. Create a new workflow manager user via the join API.
 * 2. Authenticate the new user via the login API to obtain a valid session.
 * 3. Update the user's email with a new valid value using the update API.
 * 4. Validate that the update response reflects new email and timestamps.
 * 5. Attempt to update without authentication and expect an authorization error.
 */
export async function test_api_workflow_manager_update_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new workflow manager user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(24),
  } satisfies INotificationWorkflowWorkflowManager.ICreate;

  const joinedUser: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedUser);

  // Step 2: Login with the same workflow manager credentials
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password_hash,
  } satisfies INotificationWorkflowWorkflowManager.ILogin;

  const loggedUser: INotificationWorkflowWorkflowManager.IAuthorized =
    await api.functional.auth.workflowManager.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedUser);

  // Validate that login user matches joined user
  TestValidator.equals(
    "Login user ID matches joined user",
    loggedUser.id,
    joinedUser.id,
  );
  TestValidator.equals(
    "Login user email matches joined user",
    loggedUser.email,
    joinedUser.email,
  );

  // Step 3: Update the workflow manager's email
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updateBody = {
    email: newEmail,
  } satisfies INotificationWorkflowWorkflowManager.IUpdate;

  const updatedUser: INotificationWorkflowWorkflowManager =
    await api.functional.notificationWorkflow.workflowManager.workflowManagers.update(
      connection,
      {
        id: loggedUser.id,
        body: updateBody,
      },
    );
  typia.assert(updatedUser);

  // Step 4: Validate that the email was updated correctly and timestamps present
  TestValidator.equals(
    "Updated email should match new email",
    updatedUser.email,
    newEmail,
  );
  TestValidator.predicate(
    "Updated user has created_at timestamp",
    typeof updatedUser.created_at === "string" &&
      updatedUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "Updated user has updated_at timestamp",
    typeof updatedUser.updated_at === "string" &&
      updatedUser.updated_at.length > 0,
  );

  // Step 5: Attempt update without authentication and expect failure
  // Create a new connection without headers (unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "Unauthorized update attempt should fail",
    async () => {
      await api.functional.notificationWorkflow.workflowManager.workflowManagers.update(
        unauthConn,
        {
          id: loggedUser.id,
          body: { email: typia.random<string & tags.Format<"email">>() },
        },
      );
    },
  );
}
