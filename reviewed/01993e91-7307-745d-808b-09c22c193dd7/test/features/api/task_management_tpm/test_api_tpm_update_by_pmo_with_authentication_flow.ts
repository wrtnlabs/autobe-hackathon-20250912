import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test function verifies the complete user journey for updating a TPM user
 * by a PMO user. It covers creating and authenticating PMO and TPM users,
 * performing the update action, validating correct update semantics, and
 * handling error scenarios for invalid IDs and unauthorized access.
 *
 * Steps:
 *
 * 1. Register a PMO user with realistic email, password, and name.
 * 2. Authenticate the PMO user to obtain authorization context.
 * 3. Register a TPM user.
 * 4. Authenticate the TPM user.
 * 5. Using PMO authentication, update the TPM user's email, password hash, and
 *    name with new distinct values.
 * 6. Validate the update response including unchanged created_at, updated
 *    updated_at, changed password_hash, and id/email/name matching.
 * 7. Test error scenario for invalid TPM user ID in update path parameter.
 * 8. Test unauthorized update attempt using connection with no authorization
 *    headers.
 */
export async function test_api_tpm_update_by_pmo_with_authentication_flow(
  connection: api.IConnection,
) {
  // Generate PMO user registration data
  const pmoEmail = typia.random<string & tags.Format<"email">>();
  const pmoPassword = RandomGenerator.alphaNumeric(12);
  const pmoName = RandomGenerator.name();

  // 1. create PMO user
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: {
        email: pmoEmail,
        password: pmoPassword,
        name: pmoName,
      } satisfies ITaskManagementPmo.IJoin,
    });
  typia.assert(pmoUser);

  // 2. login as PMO
  const pmoLogin: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: {
        email: pmoEmail,
        password: pmoPassword,
      } satisfies ITaskManagementPmo.ILogin,
    });
  typia.assert(pmoLogin);

  // Generate TPM user registration data
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = RandomGenerator.alphaNumeric(12);
  const tpmName = RandomGenerator.name();

  // 3. create TPM user
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmEmail,
        password: tpmPassword,
        name: tpmName,
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmUser);

  // 4. login as TPM
  const tpmLogin: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: {
        email: tpmEmail,
        password: tpmPassword,
      } satisfies ITaskManagementTpm.ILogin,
    });
  typia.assert(tpmLogin);

  // Prepare updated TPM user data with new values
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedPasswordHash = RandomGenerator.alphaNumeric(64); // Example hashed password format
  const updatedName = RandomGenerator.name();

  const updateBody: ITaskManagementTpm.IUpdate = {
    email: updatedEmail,
    password_hash: updatedPasswordHash,
    name: updatedName,
  };

  // Store original password hash
  const originalPasswordHash = tpmUser.password_hash;

  // 5. update TPM user by PMO
  const updatedTpmUser: ITaskManagementTpm =
    await api.functional.taskManagement.pmo.taskManagement.tpms.update(
      connection,
      {
        id: tpmUser.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTpmUser);

  // Validate updated TPM user properties
  TestValidator.equals(
    "updated TPM user id matches",
    updatedTpmUser.id,
    tpmUser.id,
  );
  TestValidator.equals(
    "updated TPM user email matches",
    updatedTpmUser.email,
    updatedEmail,
  );
  TestValidator.predicate(
    "updated password hash is changed",
    updatedTpmUser.password_hash !== originalPasswordHash,
  );
  TestValidator.equals(
    "updated TPM user name matches",
    updatedTpmUser.name,
    updatedName,
  );

  // Validate timestamps as ISO 8601 strings
  typia.assert<string & tags.Format<"date-time">>(updatedTpmUser.created_at);
  typia.assert<string & tags.Format<"date-time">>(updatedTpmUser.updated_at);

  TestValidator.predicate(
    "updated_at date is >= created_at date",
    new Date(updatedTpmUser.updated_at) >= new Date(updatedTpmUser.created_at),
  );

  // 7. error scenario: update with invalid id
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update with invalid TPM id should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.tpms.update(
        connection,
        {
          id: invalidId,
          body: updateBody,
        },
      );
    },
  );

  // 8. error scenario: update TPM with unauthorized connection
  // simulate unauthorized by creating independent connection without PMO auth
  const unauthorizedConn: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized update attempt should fail",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.tpms.update(
        unauthorizedConn,
        {
          id: updatedTpmUser.id,
          body: updateBody,
        },
      );
    },
  );
}
