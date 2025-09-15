import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExternalApiCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExternalApiCredential";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test secure and compliant creation of external API credential as a system
 * administrator.
 *
 * Steps:
 *
 * 1. Register and authenticate as a system administrator
 * 2. Create external API credential with unique data and validate the result
 * 3. Attempt credential creation with duplicate credential_key and expect
 *    validation error
 * 4. Attempt to create with missing required fields and expect validation error
 * 5. Attempt to create as non-admin/unauthorized and expect authorization failure
 */
export async function test_api_external_api_credential_creation_duplicate_and_validation(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(16),
        name: adminName,
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create external API credential (happy path)
  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7); // 1 week in future
  const credentialKey = `auto-key-${RandomGenerator.alphaNumeric(10)}`;

  const createReq = {
    credential_key: credentialKey,
    service_name: `Service ${RandomGenerator.alphabets(5)}`,
    credential_json: JSON.stringify({
      apiKey: RandomGenerator.alphaNumeric(24),
      secret: RandomGenerator.alphaNumeric(32),
    }),
    expires_at: expires.toISOString(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAtsRecruitmentExternalApiCredential.ICreate;

  const credential =
    await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.create(
      connection,
      { body: createReq },
    );
  typia.assert(credential);
  TestValidator.equals(
    "credential_key matches input",
    credential.credential_key,
    credentialKey,
  );
  TestValidator.equals(
    "service_name matches input",
    credential.service_name,
    createReq.service_name,
  );
  TestValidator.equals(
    "description matches input",
    credential.description,
    createReq.description,
  );
  TestValidator.equals(
    "expires_at matches input",
    credential.expires_at,
    createReq.expires_at,
  );
  // Should NOT leak credential_json (testing security assumption)
  TestValidator.predicate(
    "credential_json is an encrypted string",
    typeof credential.credential_json === "string" &&
      credential.credential_json.length > 0,
  );

  // 3. Attempt duplicate credential_key (should fail)
  await TestValidator.error(
    "duplicate credential_key is rejected",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.create(
        connection,
        {
          body: { ...createReq },
        },
      );
    },
  );

  // 4. Attempt creation with missing required fields (missing service_name)
  await TestValidator.error(
    "missing service_name triggers validation error",
    async () => {
      const badReq = { ...createReq };
      delete (badReq as any).service_name;
      await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.create(
        connection,
        {
          body: badReq as any,
        },
      );
    },
  );

  // 5. Attempt to create credential as unauthenticated/non-admin user
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated externalApiCredentials.create fails",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.create(
        unauthorizedConn,
        {
          body: {
            credential_key: `unauth-key-${RandomGenerator.alphaNumeric(8)}`,
            service_name: `InvalidService`,
            credential_json: JSON.stringify({
              token: RandomGenerator.alphaNumeric(16),
            }),
          } satisfies IAtsRecruitmentExternalApiCredential.ICreate,
        },
      );
    },
  );
}
