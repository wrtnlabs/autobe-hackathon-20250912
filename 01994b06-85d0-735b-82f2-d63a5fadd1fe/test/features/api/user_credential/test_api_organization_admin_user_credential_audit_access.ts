import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserCredential";

/**
 * Validate organization admin access to user credential archive (audit trail)
 * endpoints.
 *
 * Steps:
 *
 * 1. Register a new organization admin (using typia.random for email, name, etc.)
 * 2. Login as this admin
 * 3. Archive a credential for a user (use random userId, userType, etc.)
 * 4. Retrieve this archived credential using 'at' endpoint (by credentialId)
 *
 *    - Validate returned fields: id matches, audit fields (created_at, archived_at)
 *         are present, must NOT expose credential_hash as original.
 * 5. Try fetching a non-existent credentialId (random uuid) - validate error is
 *    thrown.
 */
export async function test_api_organization_admin_user_credential_audit_access(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoin,
  });
  typia.assert(admin);

  // 2. Explicit login (simulate login via explicit call)
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: admin.email,
        password: adminJoin.password,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);

  // 3. Archive a credential for a user
  const archivedReq = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
    user_type: RandomGenerator.pick([
      "systemadmin",
      "orgadmin",
      "clinician",
      "patient",
    ] as const),
    credential_type: RandomGenerator.pick([
      "password",
      "sso",
      "certificate",
      "webauthn",
    ] as const),
    credential_hash: RandomGenerator.alphaNumeric(64),
    created_at: new Date().toISOString(),
    archived_at: new Date(Date.now() + 1000).toISOString(),
  } satisfies IHealthcarePlatformUserCredential.ICreate;
  const archived =
    await api.functional.healthcarePlatform.organizationAdmin.userCredentials.create(
      connection,
      {
        body: archivedReq,
      },
    );
  typia.assert(archived);

  // 4. Retrieve archived credential by id
  const fetched =
    await api.functional.healthcarePlatform.organizationAdmin.userCredentials.at(
      connection,
      {
        userCredentialId: archived.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "archived credential id matches",
    fetched.id,
    archived.id,
  );
  TestValidator.equals("user id matches", fetched.user_id, archivedReq.user_id);
  TestValidator.equals(
    "user_type matches",
    fetched.user_type,
    archivedReq.user_type,
  );
  TestValidator.equals(
    "credential_type matches",
    fetched.credential_type,
    archivedReq.credential_type,
  );
  TestValidator.equals(
    "archived_at exists",
    typeof fetched.archived_at,
    "string",
  );
  TestValidator.equals(
    "created_at exists",
    typeof fetched.created_at,
    "string",
  );
  TestValidator.notEquals(
    "credential_hash should not match original input",
    fetched.credential_hash,
    archivedReq.credential_hash,
  );

  // 5. Negative: attempt to retrieve non-existent credential, expect error
  const randomCredentialId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching unknown credentialId must fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.userCredentials.at(
        connection,
        {
          userCredentialId: randomCredentialId,
        },
      );
    },
  );
}
