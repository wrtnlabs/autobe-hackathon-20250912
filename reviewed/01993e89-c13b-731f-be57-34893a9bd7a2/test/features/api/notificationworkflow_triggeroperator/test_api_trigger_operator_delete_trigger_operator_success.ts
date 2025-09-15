import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";

/**
 * E2E test for successful soft deletion of a trigger operator user.
 *
 * This test performs a complete user lifecycle including registration, soft
 * deletion, and validation that re-registration with the same credentials
 * is disallowed.
 *
 * Steps:
 *
 * 1. Create trigger operator user with valid email and password_hash
 * 2. Validate authorized user response
 * 3. Soft delete the user by ID
 * 4. Attempt to re-register with same credentials, expecting failure
 *
 * This ensures data integrity, role-based access control, and proper soft
 * delete handling.
 *
 * @param connection API connection instance
 */
export async function test_api_trigger_operator_delete_trigger_operator_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new trigger operator user by calling /auth/triggerOperator/join
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordHash: string = RandomGenerator.alphaNumeric(64);
  const createBody = {
    email,
    password_hash: passwordHash,
  } satisfies INotificationWorkflowTriggerOperator.ICreate;

  const authorized: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(authorized);

  // Step 2: Extract the user's ID
  const userId: string & tags.Format<"uuid"> = authorized.id;

  // Step 3: Delete (soft delete) the user using the DELETE endpoint
  await api.functional.notificationWorkflow.triggerOperator.triggerOperators.erase(
    connection,
    { id: userId },
  );

  // Step 4: Attempt to join again with the same email and password_hash expecting failure
  await TestValidator.error(
    "re-join with soft deleted email should fail",
    async () => {
      await api.functional.auth.triggerOperator.join.joinTriggerOperator(
        connection,
        {
          body: createBody,
        },
      );
    },
  );
}
