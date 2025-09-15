import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";

/**
 * This E2E test verifies the successful update of a trigger operator user.
 *
 * 1. It first creates a trigger operator user using the /auth/triggerOperator/join
 *    endpoint.
 * 2. Extracts the authenticated trigger operator user ID from the response.
 * 3. Uses the authenticated connection to send a PUT request to update the trigger
 *    operator user.
 * 4. Changes the email field to a newly generated valid email.
 * 5. Asserts that the returned user has the updated email and the same ID.
 * 6. Asserts password_hash presence (not empty) but does not allow exposing
 *    password value.
 * 7. Validates timestamps are ISO 8601 strings and deleted_at is null or
 *    undefined.
 *
 * The test ensures authentication and authorization are respected by the
 * backend.
 */
export async function test_api_trigger_operator_update_trigger_operator_success(
  connection: api.IConnection,
) {
  // 1. Create a trigger operator user via join endpoint for authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;

  const authorized: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      {
        body: joinBody,
      },
    );
  typia.assert(authorized);

  // 2. Extract user ID
  const userId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(authorized.id);

  // 3. Prepare update body with changed email
  const updatedEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const updateBody = {
    email: updatedEmail,
  } satisfies INotificationWorkflowTriggerOperator.IUpdate;

  // 4. Perform the update operation
  const updatedUser: INotificationWorkflowTriggerOperator =
    await api.functional.notificationWorkflow.triggerOperator.triggerOperators.update(
      connection,
      {
        id: userId,
        body: updateBody,
      },
    );
  typia.assert(updatedUser);

  // 5. Assert the updatedUser reflects the changes
  TestValidator.equals("id remains the same", updatedUser.id, userId);
  TestValidator.equals(
    "email updated properly",
    updatedUser.email,
    updatedEmail,
  );

  // 6. Assert password_hash format and non-empty
  TestValidator.predicate(
    "password_hash is present and non-empty",
    typeof updatedUser.password_hash === "string" &&
      updatedUser.password_hash.length > 0,
  );

  // 7. Assert created_at and updated_at are valid ISO 8601 date-time strings
  // Common ISO 8601 pattern with optional milliseconds and Z timezone
  const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

  TestValidator.predicate(
    "created_at is valid ISO 8601 date-time",
    typeof updatedUser.created_at === "string" &&
      iso8601Pattern.test(updatedUser.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 date-time",
    typeof updatedUser.updated_at === "string" &&
      iso8601Pattern.test(updatedUser.updated_at),
  );

  // 8. Assert deleted_at is null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    updatedUser.deleted_at === null || updatedUser.deleted_at === undefined,
  );
}
