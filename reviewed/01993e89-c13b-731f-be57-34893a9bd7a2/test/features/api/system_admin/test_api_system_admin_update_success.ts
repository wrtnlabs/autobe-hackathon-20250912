import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";

/**
 * This E2E test validates the successful update of a system administrator's
 * account by performing the following steps:
 *
 * 1. Registers a new system administrator user using the join API endpoint,
 *    generating a valid email and password.
 * 2. Updates the registered admin's email and password hash using the update
 *    API with the obtained admin ID.
 * 3. Asserts that the updated values are reflected properly in the API
 *    response, including audit timestamp verification.
 *
 * This test ensures that user info is securely and correctly modifiable,
 * timestamps are properly updated, and authentication context is handled
 * correctly.
 *
 * All API responses are validated via typia.assert, and business logic
 * validations are performed using descriptive assertions.
 *
 * @param connection The API connection context to use for requests.
 */
export async function test_api_system_admin_update_success(
  connection: api.IConnection,
) {
  // 1. Create a new system admin with join API
  const joinBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;

  const authorized: INotificationWorkflowSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2. Update the system admin's email and password_hash using the update API

  // Generate new email and password_hash
  const newEmail = `${RandomGenerator.name(1).toLowerCase()}@example.com`;
  const newPasswordHash = RandomGenerator.alphaNumeric(64);

  const updateBody = {
    email: newEmail,
    password_hash: newPasswordHash,
    deleted_at: null,
  } satisfies INotificationWorkflowSystemAdmin.IUpdate;

  const updated: INotificationWorkflowSystemAdmin =
    await api.functional.notificationWorkflow.systemAdmin.systemAdmins.update(
      connection,
      {
        id: authorized.id,
        body: updateBody,
      },
    );

  typia.assert(updated);

  // 3. Assertions
  TestValidator.equals(
    "id should remain the same after update",
    updated.id,
    authorized.id,
  );
  TestValidator.equals("email should be updated", updated.email, newEmail);
  TestValidator.equals(
    "password_hash should be updated",
    updated.password_hash,
    newPasswordHash,
  );
  TestValidator.predicate(
    "updated_at timestamp should be greater than created_at",
    new Date(updated.updated_at) > new Date(updated.created_at),
  );
  TestValidator.equals(
    "deleted_at should be null after update",
    updated.deleted_at,
    null,
  );
}
