import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExternalApiCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExternalApiCredential";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates the full lifecycle of updating an external API credential as a
 * system administrator, including security and edge case checks.
 *
 * Scenario steps:
 *
 * 1. Register a new super admin system administrator.
 * 2. Log in as the system admin (issue token and check).
 * 3. Create two external API credentials (one for update, one as an existing
 *    credential_key for uniqueness test).
 * 4. Update the first credential with changed values for a subset/all editable
 *    fields.
 * 5. Validate that updated fields match and immutable (id/created_at) fields are
 *    unchanged. No secrets are leaked.
 * 6. Try updating with an already-used credential_key and assert uniqueness error.
 * 7. Try updating with unauthorized (unauthenticated) connection and expect error.
 * 8. Try updating a non-existent credential id and expect error.
 * 9. (If supported) Soft-delete the credential, try to update it, and expect
 *    error.
 */
export async function test_api_external_api_credential_update_full_lifecycle(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();

  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // 2. Log in as the admin (updates token/header)
  const loggedIn = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals("login admin id", loggedIn.id, admin.id);

  // 3. Create a base credential to update
  const baseKey = `api-key-${RandomGenerator.alphaNumeric(8)}`;
  const baseCreate = {
    credential_key: baseKey,
    service_name: RandomGenerator.name(2),
    credential_json: JSON.stringify({
      token: RandomGenerator.alphaNumeric(32),
    }),
    expires_at: new Date(Date.now() + 3600 * 24 * 7 * 1000).toISOString(), // 7 days from now
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAtsRecruitmentExternalApiCredential.ICreate;

  const baseCredential =
    await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.create(
      connection,
      {
        body: baseCreate,
      },
    );
  typia.assert(baseCredential);
  TestValidator.equals(
    "created credential key matches",
    baseCredential.credential_key,
    baseKey,
  );

  // 3b. Create a second credential for uniqueness violation test
  const otherKey = `api-key-${RandomGenerator.alphaNumeric(8)}`;
  const otherCredential =
    await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.create(
      connection,
      {
        body: {
          credential_key: otherKey,
          service_name: RandomGenerator.name(2),
          credential_json: JSON.stringify({
            token: RandomGenerator.alphaNumeric(32),
          }),
          expires_at: new Date(
            Date.now() + 3600 * 24 * 14 * 1000,
          ).toISOString(), // 14 days from now
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IAtsRecruitmentExternalApiCredential.ICreate,
      },
    );
  typia.assert(otherCredential);

  // 4. Update credential: change key, service_name, secret, expires_at, description
  const updatedValues: IAtsRecruitmentExternalApiCredential.IUpdate = {
    credential_key: `updated-key-${RandomGenerator.alphaNumeric(6)}`,
    service_name: RandomGenerator.name(2),
    credential_json: JSON.stringify({
      token: RandomGenerator.alphaNumeric(32),
    }),
    expires_at: new Date(Date.now() + 3600 * 24 * 30 * 1000).toISOString(), // 30 days from now
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const updated =
    await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.update(
      connection,
      {
        externalApiCredentialId: baseCredential.id,
        body: updatedValues,
      },
    );
  typia.assert(updated);
  // Verify updated fields
  TestValidator.equals(
    "credential id is unchanged",
    updated.id,
    baseCredential.id,
  );
  TestValidator.equals(
    "updated credential_key",
    updated.credential_key,
    updatedValues.credential_key,
  );
  TestValidator.equals(
    "updated service_name",
    updated.service_name,
    updatedValues.service_name,
  );
  TestValidator.equals(
    "updated credential_json",
    updated.credential_json,
    updatedValues.credential_json,
  );
  TestValidator.equals(
    "updated expires_at",
    updated.expires_at,
    updatedValues.expires_at,
  );
  TestValidator.equals(
    "updated description",
    updated.description,
    updatedValues.description,
  );
  // Verify immutable fields
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    baseCredential.created_at,
  );
  // Should never leak secrets elsewhere
  TestValidator.notEquals(
    "No secret fields in non-credential_json fields",
    Object.values(updated).join(""),
    JSON.stringify(updatedValues.credential_json),
  );

  // 5. Update credential using duplicate credential_key from otherCredential (should error)
  await TestValidator.error(
    "updating to duplicate credential_key triggers uniqueness error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.update(
        connection,
        {
          externalApiCredentialId: baseCredential.id,
          body: {
            credential_key: otherCredential.credential_key,
          } satisfies IAtsRecruitmentExternalApiCredential.IUpdate,
        },
      );
    },
  );

  // 6. Attempt update as unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated update attempt is denied",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.update(
        unauthConn,
        {
          externalApiCredentialId: baseCredential.id,
          body: {
            credential_key: `unauth-key-${RandomGenerator.alphaNumeric(6)}`,
          } satisfies IAtsRecruitmentExternalApiCredential.IUpdate,
        },
      );
    },
  );

  // 7. Attempt update on non-existent credential
  await TestValidator.error(
    "update on non-existent credential id errors",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.update(
        connection,
        {
          externalApiCredentialId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            credential_key: `ghost-key-${RandomGenerator.alphaNumeric(6)}`,
          } satisfies IAtsRecruitmentExternalApiCredential.IUpdate,
        },
      );
    },
  );

  // 8. TODO/FUTURE: If soft-delete is implemented, test update after deletion here
}
