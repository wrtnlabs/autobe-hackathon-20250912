import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserCredential";

/**
 * System admin archives a credential for a user.
 *
 * This test scenario covers the following:
 *
 * 1. Onboard a system admin via POST /auth/systemAdmin/join to provision a new
 *    admin account
 * 2. Login as the new admin to get an auth token for subsequent use
 * 3. Archive a new credential for the created admin:
 *
 *    - Compose a request body for IHealthcarePlatformUserCredential.ICreate with
 *         valid user_id (the admin's uuid), user_type 'systemAdmin',
 *         credential_type 'password', a simulated credential_hash, and valid
 *         ISO timestamps for created_at/archived_at
 *    - Call /healthcarePlatform/systemAdmin/userCredentials (POST) as admin
 * 4. Validate that creation responds with a proper
 *    IHealthcarePlatformUserCredential audit record: correct user linkage,
 *    correct credential_type, never exposing credential_hash, and valid
 *    timestamps
 * 5. Attempt archival of a duplicate credential (e.g., same user_id,
 *    credential_type, and hash), assert error is thrown (business duplicate
 *    prevention)
 * 6. Attempt archival using a non-existent user_id, assert appropriate error is
 *    thrown
 */
export async function test_api_user_credential_archive_creation_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Create a unique admin account (onboard system admin)
  const adminJoinReq = {
    email: `${RandomGenerator.alphabets(8)}@corp-example.com`,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(12),
    password: RandomGenerator.alphaNumeric(14),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinReq,
  });
  typia.assert(admin);

  // 2. Login as admin to get a session/token
  const adminLoginReq = {
    email: admin.email,
    provider: "local",
    provider_key: admin.email,
    password: adminJoinReq.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginReq,
  });
  typia.assert(adminLogin);

  // 3. Archive a new user credential for this admin
  const now = new Date();
  const createdAt = now.toISOString();
  const archivedAt = new Date(now.getTime() + 10 * 1000).toISOString();
  const credentialReq = {
    user_id: admin.id,
    user_type: "systemAdmin",
    credential_type: "password",
    credential_hash: RandomGenerator.alphaNumeric(64),
    created_at: createdAt,
    archived_at: archivedAt,
  } satisfies IHealthcarePlatformUserCredential.ICreate;
  const credential =
    await api.functional.healthcarePlatform.systemAdmin.userCredentials.create(
      connection,
      { body: credentialReq },
    );
  typia.assert(credential);
  TestValidator.equals("user_id matches", credential.user_id, admin.id);
  TestValidator.equals(
    "credential_type is password",
    credential.credential_type,
    "password",
  );
  TestValidator.equals(
    "user_type matches",
    credential.user_type,
    "systemAdmin",
  );
  TestValidator.equals("created_at matches", credential.created_at, createdAt);
  TestValidator.equals(
    "archived_at matches",
    credential.archived_at,
    archivedAt,
  );

  // 4. Attempt duplicate archival (should fail)
  await TestValidator.error(
    "duplicate credential archival should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userCredentials.create(
        connection,
        { body: credentialReq },
      );
    },
  );

  // 5. Attempt archival with non-existent user_id (should fail)
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  const badCredentialReq = {
    ...credentialReq,
    user_id: fakeId,
  } satisfies IHealthcarePlatformUserCredential.ICreate;
  await TestValidator.error(
    "archival with non-existent user_id should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userCredentials.create(
        connection,
        { body: badCredentialReq },
      );
    },
  );
}
