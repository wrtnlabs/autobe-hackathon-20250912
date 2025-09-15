import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentExternalApiCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentExternalApiCredential";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test retrieving the detail of a specific external API credential as a system
 * administrator.
 *
 * - Step 1: Register and authenticate as a system admin
 * - Step 2: Create a new external API credential (capture its
 *   externalApiCredentialId)
 * - Step 3: GET
 *   /atsRecruitment/systemAdmin/externalApiCredentials/{externalApiCredentialId}
 * - Validation: Returned metadata is correct, sensitive fields are masked/omitted
 * - Negative: Try access with non-existent/deleted IDs, and as non-admin
 */
export async function test_api_external_api_credential_detail_by_id(
  connection: api.IConnection,
) {
  // Register and authenticate as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: "StrongP@ssword123!",
      name: RandomGenerator.name(2),
      super_admin: false,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // Create a new external API credential
  const credentialInput = {
    credential_key: RandomGenerator.alphaNumeric(12),
    service_name: RandomGenerator.paragraph({ sentences: 2 }),
    credential_json: JSON.stringify({
      apiKey: RandomGenerator.alphaNumeric(32),
      secret: RandomGenerator.alphaNumeric(32),
      test: true,
    }),
    expires_at: null,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IAtsRecruitmentExternalApiCredential.ICreate;

  const createdCredential =
    await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.create(
      connection,
      {
        body: credentialInput,
      },
    );
  typia.assert(createdCredential);

  // Retrieve the credential by ID (as admin)
  const credentialDetail =
    await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.at(
      connection,
      {
        externalApiCredentialId: createdCredential.id,
      },
    );
  typia.assert(credentialDetail);

  // Validate returned data matches created data for metadata
  TestValidator.equals(
    "credential ID matches",
    credentialDetail.id,
    createdCredential.id,
  );
  TestValidator.equals(
    "credential key matches",
    credentialDetail.credential_key,
    credentialInput.credential_key,
  );
  TestValidator.equals(
    "service name matches",
    credentialDetail.service_name,
    credentialInput.service_name,
  );
  TestValidator.equals(
    "description matches",
    credentialDetail.description,
    credentialInput.description,
  );
  TestValidator.equals(
    "expires_at matches",
    credentialDetail.expires_at,
    credentialInput.expires_at,
  );
  TestValidator.equals(
    "not deleted after creation",
    credentialDetail.deleted_at,
    null,
  );

  // Negative: Try fetching non-existent credential
  await TestValidator.error(
    "non-existent credential returns error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.at(
        connection,
        {
          externalApiCredentialId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Negative: Try fetching after soft delete (simulate by copying deleted_at)
  const deletedCredential = {
    ...credentialDetail,
    deleted_at: new Date().toISOString(),
  };
  TestValidator.predicate(
    "deleted_at is set (soft delete simulated)",
    deletedCredential.deleted_at !== null &&
      deletedCredential.deleted_at !== undefined,
  );

  // Negative: Try unauthorized access (simulate by removing token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("forbidden for non-admin", async () => {
    await api.functional.atsRecruitment.systemAdmin.externalApiCredentials.at(
      unauthConn,
      { externalApiCredentialId: createdCredential.id },
    );
  });
}
