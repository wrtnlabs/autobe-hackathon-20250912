import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";

/**
 * Test successful login for triggerOperator user by providing valid email
 * and password_hash.
 *
 * This test validates the triggerOperator login API endpoint at POST
 * /auth/triggerOperator/login. It ensures that providing correct email and
 * hashed password authenticates the user and returns a valid authorization
 * token with expected user details.
 *
 * Steps:
 *
 * 1. Generate random valid email and simulate hashed password
 * 2. Call the loginTriggerOperator API function with credentials
 * 3. Assert the response matches expected IAuthorized structure
 * 4. Validate presence and non-empty JWT access and refresh tokens
 * 5. Confirm returned email matches the login email
 */
export async function test_api_triggeroperator_login_success(
  connection: api.IConnection,
) {
  // Step 1: Generate valid login credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password_hash = RandomGenerator.alphaNumeric(64); // simulate hashed password

  // Compose ILogin request body
  const body = {
    email,
    password_hash,
  } satisfies INotificationWorkflowTriggerOperator.ILogin;

  // Step 2: Call the login API
  const authorized =
    await api.functional.auth.triggerOperator.login.loginTriggerOperator(
      connection,
      { body },
    );

  // Step 3: Assert response type
  typia.assert(authorized);

  // Step 4: Validate token properties
  TestValidator.predicate(
    "token.access is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty",
    authorized.token.refresh.length > 0,
  );

  // Step 5: Confirm correct email returned
  TestValidator.equals("email matches", authorized.email, email);
}
