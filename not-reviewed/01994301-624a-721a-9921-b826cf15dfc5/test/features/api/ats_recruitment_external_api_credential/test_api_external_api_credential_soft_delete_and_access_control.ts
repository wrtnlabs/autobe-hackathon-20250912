import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExternalApiCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExternalApiCredential";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate soft deletion of an external API credential by a system admin.
 *
 * Steps:
 *
 * 1. Register (join) a new system admin to obtain valid credentials (record
 *    email/password for later)
 * 2. Log in as the system admin (set session context for future API calls)
 * 3. Create a new external API credential and record its id
 * 4. Soft delete the credential using the API (erase endpoint); check for
 *    error-free completion
 * 5. Call delete again (should not throw error -- idempotency)
 * 6. Attempt delete as an unauthenticated user (by using a fresh connection object
 *    without credentials)
 * 7. (Simulate) Check soft-deleted credential field: no 'hard delete', deleted_at
 *    is set, credential_json not exposed, credential remains for compliance.
 */
export async function test_api_external_api_credential_soft_delete_and_access_control(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(14);
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email,
      password,
      name: RandomGenerator.name(),
      super_admin: false,
    },
  });
  typia.assert(admin);

  // 2. Login as system admin
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: { email, password },
  });
  typia.assert(adminLogin);

  // 3. Create a new external API credential
  const createBody = {
    credential_key: RandomGenerator.alphaNumeric(8),
    service_name: RandomGenerator.name(2),
    credential_json: JSON.stringify({
      token: RandomGenerator.alphaNumeric(32),
    }),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  };
  const credential =
    await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(credential);
  TestValidator.equals(
    "created credential has not been soft-deleted",
    credential.deleted_at,
    null,
  );

  // 4. Soft-delete it as the same admin (DELETE)
  await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.erase(
    connection,
    {
      externalApiCredentialId: credential.id,
    },
  );
  // Soft deletion doesn't return the entity; check by trying another delete (idempotency)
  await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.erase(
    connection,
    {
      externalApiCredentialId: credential.id,
    },
  );

  // 5. Attempt to soft-delete with an unauthenticated connection (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot soft delete credential",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.erase(
        unauthConn,
        {
          externalApiCredentialId: credential.id,
        },
      );
    },
  );

  // 6. There is no entity returned from soft-delete, so we check by re-creating credential with same key (should trigger unique error)
  await TestValidator.error(
    "cannot recreate externalApiCredential with same key after soft delete (unique constraint)",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.create(
        connection,
        {
          body: createBody,
        },
      );
    },
  );
}
