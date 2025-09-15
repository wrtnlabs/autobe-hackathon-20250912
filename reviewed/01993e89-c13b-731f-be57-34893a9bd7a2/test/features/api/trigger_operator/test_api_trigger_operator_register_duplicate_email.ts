import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";

/**
 * Test scenario for validating duplicate email rejection on trigger
 * operator registration.
 *
 * This test attempts to register a trigger operator user with an email
 * already registered in the system. The system must reject this attempt by
 * throwing an error, enforcing the uniqueness constraint on emails.
 *
 * Steps:
 *
 * 1. Register a new trigger operator with a unique email.
 * 2. Confirm that the registration succeeded.
 * 3. Attempt to register another trigger operator using the same email.
 * 4. Expect an error due to duplicate email.
 *
 * This ensures the system does not allow duplicate trigger operator users
 * with identical emails.
 */
export async function test_api_trigger_operator_register_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Register a new trigger operator user with a unique email and password hash
  const requestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;

  const registeredUser =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      { body: requestBody },
    );
  typia.assert(registeredUser);

  // Step 2: Attempt to register another user with the same email (duplicate attempt)
  const duplicateRequest = {
    email: requestBody.email, // Reusing registered email to trigger duplicate error
    password_hash: RandomGenerator.alphaNumeric(64),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;

  // Step 3: Validate that duplicate registration throws an error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.triggerOperator.join.joinTriggerOperator(
        connection,
        { body: duplicateRequest },
      );
    },
  );
}
