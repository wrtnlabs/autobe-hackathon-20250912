import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Verify policy version retrieval for system administrator role with field
 * validation and authentication.
 *
 * Steps:
 *
 * 1. Register a system admin (adminEmail, provider: 'local', provider_key,
 *    password, full_name, phone).
 * 2. Login as that admin (re-obtain token, ensure header is used for protected
 *    routes).
 * 3. Create an organization for context (code, name, status).
 * 4. Create a policy version for the organization (fill all ICreate fields;
 *    expires_at/document_hash may be present or absent).
 * 5. Retrieve the created policy version by id.
 *
 *    - Assert typia.assert on response
 *    - Check all response fields (except timestamps and id) match creation input
 * 6. Attempt to retrieve a random (non-existent) policyVersionId and ensure
 *    error is thrown.
 */
export async function test_api_policy_version_retrieval_system_admin_success(
  connection: api.IConnection,
) {
  // Step 1: Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinInput = {
    email: adminEmail,
    full_name: RandomGenerator.name(3),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // Step 2: Login as the system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminJoinInput.password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // Step 3: Create organization
  const orgInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgInput },
    );
  typia.assert(organization);

  // Step 4: Create policy version for the org
  const now = new Date();
  const effectiveAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const policyCreateInput = {
    organization_id: organization.id,
    policy_type: RandomGenerator.alphabets(10),
    version: "v1.0.0",
    effective_at: effectiveAt,
    expires_at: expiresAt,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    document_uri: `https://example.com/policy/${RandomGenerator.alphaNumeric(12)}`,
    document_hash: RandomGenerator.alphaNumeric(32),
  } satisfies IHealthcarePlatformPolicyVersion.ICreate;
  const createdPolicy =
    await api.functional.healthcarePlatform.systemAdmin.policyVersions.create(
      connection,
      { body: policyCreateInput },
    );
  typia.assert(createdPolicy);

  // Step 5: Retrieve policy version by ID
  const fetched =
    await api.functional.healthcarePlatform.systemAdmin.policyVersions.at(
      connection,
      { policyVersionId: createdPolicy.id },
    );
  typia.assert(fetched);

  TestValidator.equals(
    "organization_id matches",
    fetched.organization_id,
    policyCreateInput.organization_id,
  );
  TestValidator.equals(
    "policy_type matches",
    fetched.policy_type,
    policyCreateInput.policy_type,
  );
  TestValidator.equals(
    "version matches",
    fetched.version,
    policyCreateInput.version,
  );
  TestValidator.equals(
    "effective_at matches",
    fetched.effective_at,
    policyCreateInput.effective_at,
  );
  TestValidator.equals(
    "expires_at matches",
    fetched.expires_at,
    policyCreateInput.expires_at,
  );
  TestValidator.equals("title matches", fetched.title, policyCreateInput.title);
  TestValidator.equals(
    "document_uri matches",
    fetched.document_uri,
    policyCreateInput.document_uri,
  );
  TestValidator.equals(
    "document_hash matches",
    fetched.document_hash,
    policyCreateInput.document_hash,
  );

  // Step 6: Retrieve non-existent policy version and expect error
  await TestValidator.error(
    "retrieving non-existent policyVersionId should error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.policyVersions.at(
        connection,
        { policyVersionId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
}
