import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * Validate that a Project Manager user can update developer information by
 * ID.
 *
 * This test covers the entire workflow:
 *
 * 1. Create a PM user by calling /auth/pm/join
 * 2. Log in as PM user via /auth/pm/login
 * 3. Prepare an existing developer's ID and data to update
 * 4. Perform PUT request to update the developer's email, password_hash, and
 *    name
 * 5. Validate that the update persisted and the response matches expectations
 * 6. Verify error cases such as duplicate email, unauthorized attempt, and
 *    update of non-existent developer
 *
 * All inputs conform to required formats: valid emails, UUID strings, and
 * ISO 8601 date-time strings Outputs are asserted with typia.assert for
 * rigorous type validation TestValidator is used for behavior and error
 * validations
 */
export async function test_api_developer_update_by_pm_user(
  connection: api.IConnection,
) {
  // 1. Register PM user
  const pmEmail = typia.random<string & tags.Format<"email">>();
  const pmCreateBody = {
    email: pmEmail,
    password: "StrongPass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(pmAuthorized);

  // 2. Login as PM user
  const pmLoginBody = {
    email: pmEmail,
    password: "StrongPass123!",
  } satisfies ITaskManagementPm.ILogin;

  const pmLoggedIn: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: pmLoginBody,
    });
  typia.assert(pmLoggedIn);

  // 3. Prepare an existing developer user to update
  // For this test, simulate an existing developer
  const existingDeveloperId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare update body with new values
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newPasswordHash = RandomGenerator.alphaNumeric(64); // simulate a hash
  const newName = RandomGenerator.name();
  // We can add deleted_at as null to indicate active developer
  const updateBody = {
    email: newEmail,
    password_hash: newPasswordHash,
    name: newName,
    deleted_at: null,
  } satisfies ITaskManagementDeveloper.IUpdate;

  // 5. Call the update API
  const updatedDeveloper: ITaskManagementDeveloper =
    await api.functional.taskManagement.pm.taskManagement.developers.update(
      connection,
      {
        id: existingDeveloperId,
        body: updateBody,
      },
    );
  typia.assert(updatedDeveloper);

  // 6. Validate the update persisted correctly
  TestValidator.equals(
    "Developer ID remains same",
    updatedDeveloper.id,
    existingDeveloperId,
  );
  TestValidator.equals(
    "Developer email updated",
    updatedDeveloper.email,
    newEmail,
  );
  TestValidator.equals(
    "Developer password_hash updated",
    updatedDeveloper.password_hash,
    newPasswordHash,
  );
  TestValidator.equals(
    "Developer name updated",
    updatedDeveloper.name,
    newName,
  );
  TestValidator.equals(
    "Developer deleted_at should be null",
    updatedDeveloper.deleted_at,
    null,
  );

  // 7. Failure case: duplicate email update should fail
  await TestValidator.error("Duplicate email update should fail", async () => {
    await api.functional.taskManagement.pm.taskManagement.developers.update(
      connection,
      {
        id: existingDeveloperId,
        body: {
          email: pmEmail, // email already used by PM user (simulate duplicate)
        },
      },
    );
  });

  // 8. Failure case: unauthorized update attempt (simulate by using unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Unauthorized update attempt should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.developers.update(
        unauthenticatedConnection,
        {
          id: existingDeveloperId,
          body: { name: "Hacker" },
        },
      );
    },
  );

  // 9. Failure case: update non-existent developer (simulated by random UUID)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Update non-existent developer should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.developers.update(
        connection,
        {
          id: nonExistentId,
          body: { name: "Ghost Developer" },
        },
      );
    },
  );
}
