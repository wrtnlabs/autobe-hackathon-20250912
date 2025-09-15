import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * Test failure on duplicate email for workflowManager user join.
 *
 * This test ensures that creating a workflowManager user with an email
 * already registered in the system causes a uniqueness constraint violation
 * error.
 *
 * Steps:
 *
 * 1. Create a new workflowManager user with a unique email and password hash.
 * 2. Validate that the user is successfully created with correct authorized
 *    info.
 * 3. Attempt to create another user with the same email and password hash.
 * 4. Expect an error to be thrown indicating duplicate email is not allowed.
 *
 * This test validates business logic of user registration enforcing unique
 * emails.
 */
export async function test_api_auth_workflow_manager_join_email_duplicate(
  connection: api.IConnection,
) {
  // Generate a more realistic email string
  const email = `${RandomGenerator.name(1).toLowerCase()}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(64);

  // First join attempt: should succeed
  const firstUser = await api.functional.auth.workflowManager.join(connection, {
    body: {
      email,
      password_hash: passwordHash,
    } satisfies INotificationWorkflowWorkflowManager.ICreate,
  });
  typia.assert(firstUser);
  TestValidator.predicate(
    "first user has id",
    typeof firstUser.id === "string" && firstUser.id.length > 0,
  );
  TestValidator.equals("first user email matches", firstUser.email, email);
  TestValidator.predicate(
    "first user has token.access",
    typeof firstUser.token.access === "string" &&
      firstUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "first user has token.refresh",
    typeof firstUser.token.refresh === "string" &&
      firstUser.token.refresh.length > 0,
  );

  // Second join attempt with same email: should fail
  await TestValidator.error("duplicate email join fails", async () => {
    await api.functional.auth.workflowManager.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
      } satisfies INotificationWorkflowWorkflowManager.ICreate,
    });
  });
}
