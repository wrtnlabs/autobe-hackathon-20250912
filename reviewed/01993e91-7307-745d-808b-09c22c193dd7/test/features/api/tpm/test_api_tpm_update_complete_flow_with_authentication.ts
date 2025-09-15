import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_tpm_update_complete_flow_with_authentication(
  connection: api.IConnection,
) {
  // Step 1: Register a new TPM user
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newPassword = RandomGenerator.alphaNumeric(12);
  const newName = RandomGenerator.name(3);

  const joinBody = {
    email: newEmail,
    password: newPassword,
    name: newName,
  } satisfies ITaskManagementTpm.IJoin;

  const authorizedUser = await api.functional.auth.tpm.join(connection, {
    body: joinBody,
  });
  typia.assert(authorizedUser);

  TestValidator.predicate(
    "join response access token exists",
    authorizedUser.access_token !== undefined &&
      authorizedUser.access_token !== null,
  );
  TestValidator.predicate(
    "join response refresh token exists",
    authorizedUser.refresh_token !== undefined &&
      authorizedUser.refresh_token !== null,
  );

  // Step 2: Login as the new TPM user
  const loginBody = {
    email: newEmail,
    password: newPassword,
  } satisfies ITaskManagementTpm.ILogin;

  const loginAuthorizedUser = await api.functional.auth.tpm.login(connection, {
    body: loginBody,
  });
  typia.assert(loginAuthorizedUser);

  TestValidator.equals(
    "login user ID matches join user ID",
    loginAuthorizedUser.id,
    authorizedUser.id,
  );
  TestValidator.predicate(
    "login response access token exists",
    loginAuthorizedUser.access_token !== undefined &&
      loginAuthorizedUser.access_token !== null,
  );
  TestValidator.predicate(
    "login response refresh token exists",
    loginAuthorizedUser.refresh_token !== undefined &&
      loginAuthorizedUser.refresh_token !== null,
  );

  // Step 3: Update the TPM user
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedPasswordHash = RandomGenerator.alphaNumeric(16);
  const updatedName = RandomGenerator.name(4);

  const updateBody = {
    email: updatedEmail,
    password_hash: updatedPasswordHash,
    name: updatedName,
  } satisfies ITaskManagementTpm.IUpdate;

  const updatedUser =
    await api.functional.taskManagement.tpm.taskManagement.tpms.update(
      connection,
      {
        id: authorizedUser.id,
        body: updateBody,
      },
    );
  typia.assert(updatedUser);

  TestValidator.equals(
    "updated user ID matches original user ID",
    updatedUser.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "updated email matches request",
    updatedUser.email,
    updatedEmail,
  );
  TestValidator.equals(
    "updated name matches request",
    updatedUser.name,
    updatedName,
  );
  TestValidator.equals(
    "updated password_hash matches request",
    updatedUser.password_hash,
    updatedPasswordHash,
  );

  // Step 4: Test error scenarios
  // 4.1 Invalid ID update
  await TestValidator.error("update with invalid ID should fail", async () => {
    await api.functional.taskManagement.tpm.taskManagement.tpms.update(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(), // Random UUID assumed invalid
        body: updateBody,
      },
    );
  });

  // 4.2 Duplicate email update (attempt to update with already used email)
  await TestValidator.error(
    "update with duplicate email should fail",
    async () => {
      await api.functional.taskManagement.tpm.taskManagement.tpms.update(
        connection,
        {
          id: authorizedUser.id,
          body: {
            email: updatedEmail, // duplicate email
          } satisfies ITaskManagementTpm.IUpdate,
        },
      );
    },
  );

  // 4.3 Unauthorized update attempt
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized update attempt should fail",
    async () => {
      await api.functional.taskManagement.tpm.taskManagement.tpms.update(
        unauthenticatedConnection,
        {
          id: authorizedUser.id,
          body: updateBody,
        },
      );
    },
  );
}
