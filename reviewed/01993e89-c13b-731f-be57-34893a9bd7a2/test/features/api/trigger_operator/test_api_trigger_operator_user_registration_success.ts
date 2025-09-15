import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";

/**
 * Test the successful registration of a trigger operator user.
 *
 * This test validates that the public API endpoint
 * /auth/triggerOperator/join correctly registers a new trigger operator
 * user when provided with unique email and password hash. It ensures that
 * the response contains a valid authorized token response matching the
 * expected schema.
 *
 * The steps are:
 *
 * 1. Generate a unique valid email and a random password hash string.
 * 2. Create the request body with required fields.
 * 3. Call the API function to register the user.
 * 4. Assert that the response type matches
 *    INotificationWorkflowTriggerOperator.IAuthorized.
 *
 * This test is critical as it represents the entry point for trigger
 * operator user workflows, establishing the user's identity, credentials,
 * and authentication tokens.
 */
export async function test_api_trigger_operator_user_registration_success(
  connection: api.IConnection,
) {
  // Step 1: Generate a unique email and password hash for user creation
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordHash: string = RandomGenerator.alphaNumeric(64); // assuming SHA-256 hash length in hex

  // Step 2: Prepare the request body according to INotificationWorkflowTriggerOperator.ICreate
  const requestBody = {
    email: email,
    password_hash: passwordHash,
  } satisfies INotificationWorkflowTriggerOperator.ICreate;

  // Step 3: Call the joinTriggerOperator API to register the user
  const response: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      { body: requestBody },
    );

  // Step 4: Validate the response with typia.assert
  typia.assert(response);
  // Additional business logic validations can be added below if needed
}
