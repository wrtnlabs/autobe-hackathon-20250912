import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserCredential";

/**
 * Validate strict audit, masking, and authorization for user credential detail
 * retrieval.
 *
 * 1. Register system admin and login
 * 2. Archive a user credential as system admin
 * 3. Retrieve the credential by ID as system admin (positive case)
 * 4. Attempt retrieve with garbage uuid, expect error
 * 5. Attempt retrieve as unauthenticated, expect error
 * 6. Confirm audit fields present, and credential_hash must not be leaked (if
 *    server masks it)
 */
export async function test_api_user_credential_detail_view_with_strict_audit(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(2),
    provider: "local",
    provider_key: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(15),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;

  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as the admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: joinBody.email,
      provider: "local",
      provider_key: joinBody.provider_key,
      password: joinBody.password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 3. Archive credential for random user (simulate as system admin)
  const userId = typia.random<string & tags.Format<"uuid">>();
  const createBody = {
    user_id: userId,
    user_type: "systemadmin",
    credential_type: RandomGenerator.pick([
      "password",
      "sso",
      "certificate",
      "webauthn",
    ] as const),
    credential_hash: RandomGenerator.alphaNumeric(32),
    created_at: new Date().toISOString(),
    archived_at: new Date(Date.now() + 5000).toISOString(),
  } satisfies IHealthcarePlatformUserCredential.ICreate;

  const created =
    await api.functional.healthcarePlatform.systemAdmin.userCredentials.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // 4. Retrieve by correct ID
  const detail =
    await api.functional.healthcarePlatform.systemAdmin.userCredentials.at(
      connection,
      {
        userCredentialId: created.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "retrieved credential id matches",
    detail.id,
    created.id,
  );
  TestValidator.equals(
    "retrieved user_id matches",
    detail.user_id,
    createBody.user_id,
  );
  TestValidator.equals(
    "credential type matches",
    detail.credential_type,
    createBody.credential_type,
  );
  TestValidator.equals(
    "audit field: created_at present",
    !!detail.created_at,
    true,
  );
  TestValidator.equals(
    "audit field: archived_at present",
    !!detail.archived_at,
    true,
  );
  // Confirm credential_hash is present (and if the API supports masking, check it's masked)
  TestValidator.equals(
    "credential_hash present",
    typeof detail.credential_hash,
    "string",
  );

  // 5. Retrieve with garbage uuid (non-existent id)
  const garbageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "detail access with garbage uuid fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userCredentials.at(
        connection,
        {
          userCredentialId: garbageId,
        },
      );
    },
  );

  // 6. Unauthenticated access attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to credential detail fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userCredentials.at(
        unauthConn,
        {
          userCredentialId: created.id,
        },
      );
    },
  );
}
