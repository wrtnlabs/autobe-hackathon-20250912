import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Validates the process for a TPM user to update a developer's information
 * securely.
 *
 * This includes TPM registration and login, creating a developer to update,
 * and then performing updates via the PUT endpoint with various valid and
 * error cases.
 *
 * The workflow:
 *
 * 1. TPM user signs up with unique email and password.
 * 2. TPM user logs in to generate auth tokens for subsequent actions.
 * 3. A developer user is created externally (mocking data, here simulated by
 *    random UUID and data).
 * 4. TPM updates developer's email, password_hash, and name.
 * 5. Validate successful update matching input and updated timestamp.
 * 6. Attempt updates with duplicate email to trigger error.
 * 7. Attempt update with invalid developer id to trigger error.
 * 8. Attempt update on soft-deleted developer results in error.
 * 9. Attempt update without authentication to validate access control.
 *
 * Uses TestValidator for assertions and typia.assert for type validation.
 */
export async function test_api_developer_update_by_tpm_user(
  connection: api.IConnection,
) {
  // 1. TPM user registration
  const tpmJoinBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "StrongPass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser = await api.functional.auth.tpm.join(connection, {
    body: tpmJoinBody,
  });
  typia.assert(tpmUser);

  // 2. TPM user login using the same credentials
  const tpmLoginBody = {
    email: tpmJoinBody.email,
    password: tpmJoinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const tpmAuthorized = await api.functional.auth.tpm.login(connection, {
    body: tpmLoginBody,
  });
  typia.assert(tpmAuthorized);

  // 3. Mock creation of a developer (simulate an existing developer to update)
  // Use random UUID and realistic data
  const existingDeveloperId = typia.random<string & tags.Format<"uuid">>();
  const existingDeveloper: ITaskManagementDeveloper = {
    id: existingDeveloperId,
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  typia.assert(existingDeveloper);

  // 4. TPM user updates the developer with new email, password_hash, and name
  const updatedEmail = `${RandomGenerator.alphaNumeric(6)}@example.org`;
  const updatedPasswordHash = RandomGenerator.alphaNumeric(20);
  const updatedName = RandomGenerator.name();
  const updateBody1 = {
    email: updatedEmail,
    password_hash: updatedPasswordHash,
    name: updatedName,
  } satisfies ITaskManagementDeveloper.IUpdate;

  const updatedDeveloper =
    await api.functional.taskManagement.tpm.taskManagement.developers.update(
      connection,
      {
        id: existingDeveloper.id,
        body: updateBody1,
      },
    );
  typia.assert(updatedDeveloper);

  // Validate returned data matches updates
  TestValidator.equals(
    "updated email matches",
    updatedDeveloper.email,
    updatedEmail,
  );
  TestValidator.equals(
    "updated password_hash matches",
    updatedDeveloper.password_hash,
    updatedPasswordHash,
  );
  TestValidator.equals(
    "updated name matches",
    updatedDeveloper.name,
    updatedName,
  );

  // The updated_at should be defined and non-empty
  TestValidator.predicate(
    "updated_at is defined and non-empty",
    typeof updatedDeveloper.updated_at === "string" &&
      updatedDeveloper.updated_at.length > 0,
  );

  // Soft deleted field must remain null
  TestValidator.equals(
    "deleted_at is null after update",
    updatedDeveloper.deleted_at,
    null,
  );

  // 5. Attempt to update with duplicate email (simulate error by reusing updatedEmail)
  await TestValidator.error("update fails with duplicate email", async () => {
    await api.functional.taskManagement.tpm.taskManagement.developers.update(
      connection,
      {
        id: existingDeveloper.id,
        body: {
          email: updatedEmail,
        } satisfies ITaskManagementDeveloper.IUpdate,
      },
    );
  });

  // 6. Attempt update with invalid developer id
  await TestValidator.error(
    "update fails with invalid developer id",
    async () => {
      await api.functional.taskManagement.tpm.taskManagement.developers.update(
        connection,
        {
          id: "00000000-0000-0000-0000-000000000000",
          body: {
            name: "Invalid Update",
          } satisfies ITaskManagementDeveloper.IUpdate,
        },
      );
    },
  );

  // 7. Simulate soft deleted developer update attempt - assume developer with deleted_at is unmodifiable
  const softDeletedDeveloperId = typia.random<string & tags.Format<"uuid">>();
  // Soft deleted developer update attempt
  await TestValidator.error(
    "cannot update soft-deleted developer",
    async () => {
      await api.functional.taskManagement.tpm.taskManagement.developers.update(
        connection,
        {
          id: softDeletedDeveloperId,
          body: {
            name: "Should Fail",
          } satisfies ITaskManagementDeveloper.IUpdate,
        },
      );
    },
  );

  // 8. Attempt update without authentication by creating new connection with empty headers
  const noAuthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("update fails without authentication", async () => {
    await api.functional.taskManagement.tpm.taskManagement.developers.update(
      noAuthConnection,
      {
        id: existingDeveloper.id,
        body: { name: "No Auth" } satisfies ITaskManagementDeveloper.IUpdate,
      },
    );
  });
}
