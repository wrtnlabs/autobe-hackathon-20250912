import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserCredential";

/**
 * Validate updating archived user credentials as a healthcare platform system
 * administrator.
 *
 * Tests both successful credential update (change hash/type/date) and failure
 * scenarios:
 *
 * - Update with non-existent credentialId
 * - Update with business invalid values (bad type, impossible hash, bad dates)
 *
 * Workflow:
 *
 * 1. Register and log in a system admin (for session)
 * 2. Create a new user credential (so we have a valid id to update)
 * 3. Update the credential with new valid credential_type/hash/archived_at. Typia
 *    asserts success.
 * 4. Attempt to update with a non-existent (random) UUID, assert error.
 * 5. Attempt update with obviously invalid/empty credential_type, assert error.
 * 6. Attempt update with clearly invalid archived_at (malformed ISO), assert
 *    error.
 */
export async function test_api_update_user_credential_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Register platform system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Login (session token will be set in connection.headers)
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminJoin.token ? RandomGenerator.alphaNumeric(12) : undefined,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Create a new credential to update
  const credentialCreateBody = {
    user_id: adminJoin.id,
    user_type: "systemadmin",
    credential_type: "password",
    credential_hash: RandomGenerator.alphaNumeric(32),
    created_at: new Date().toISOString(),
    archived_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  } satisfies IHealthcarePlatformUserCredential.ICreate;
  const createdCredential =
    await api.functional.healthcarePlatform.systemAdmin.userCredentials.create(
      connection,
      {
        body: credentialCreateBody,
      },
    );
  typia.assert(createdCredential);
  // Store for update
  const credentialId = createdCredential.id;

  // 4. Success scenario: update credential_type and hash/archived_at
  const updateBody = {
    credential_type: "sso",
    credential_hash: RandomGenerator.alphaNumeric(64),
    archived_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
  } satisfies IHealthcarePlatformUserCredential.IUpdate;
  const updatedCredential =
    await api.functional.healthcarePlatform.systemAdmin.userCredentials.update(
      connection,
      {
        userCredentialId: credentialId,
        body: updateBody,
      },
    );
  typia.assert(updatedCredential);
  // Validate actual update
  TestValidator.equals(
    "credential id matches after update",
    updatedCredential.id,
    credentialId,
  );
  TestValidator.equals(
    "credential_type updated",
    updatedCredential.credential_type,
    updateBody.credential_type,
  );
  TestValidator.equals(
    "credential_hash updated",
    updatedCredential.credential_hash,
    updateBody.credential_hash,
  );
  TestValidator.equals(
    "archived_at updated",
    updatedCredential.archived_at,
    updateBody.archived_at,
  );

  // 5. Failure scenario: update a non-existent credential
  await TestValidator.error(
    "update non-existent userCredentialId must fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userCredentials.update(
        connection,
        {
          userCredentialId: typia.random<string & tags.Format<"uuid">>(), // random non-existent
          body: updateBody,
        },
      );
    },
  );

  // 6. Failure scenario: update with invalid values (empty credential_type)
  await TestValidator.error(
    "update with invalid credential_type fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userCredentials.update(
        connection,
        {
          userCredentialId: credentialId,
          body: {
            credential_type: "", // likely rejected by business/type rules
          } satisfies IHealthcarePlatformUserCredential.IUpdate,
        },
      );
    },
  );

  // 7. Failure: invalid archived_at (malformed date)
  await TestValidator.error(
    "update with invalid archived_at fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userCredentials.update(
        connection,
        {
          userCredentialId: credentialId,
          body: {
            archived_at: "not-a-date-time", // violates date-time tag
          } satisfies IHealthcarePlatformUserCredential.IUpdate,
        },
      );
    },
  );
}
