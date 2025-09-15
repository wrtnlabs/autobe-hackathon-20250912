import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * System admin can update policy version metadata fields, validation and
 * permissions enforced.
 *
 * 1. Register and authenticate as system admin via /auth/systemAdmin/join
 * 2. Create a new policy version as the update target
 *    (/healthcarePlatform/systemAdmin/policyVersions)
 * 3. Update policy version metadata fields (expires_at, document_uri, etc), check
 *    update
 * 4. Attempt update with a past expiration date for business rule validation
 *    (should fail)
 * 5. Attempt to update non-existent policy version (random UUID, should fail)
 * 6. Attempt update with unauthenticated user (empty headers, should fail)
 *
 * Never test type system – all negative testing is for runtime or business
 * logic only.
 */
export async function test_api_policy_version_update_by_system_admin(
  connection: api.IConnection,
) {
  // Step 1: Setup system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // Step 2: Create a new policy version
  const policyCreateBody = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    policy_type: RandomGenerator.pick([
      "privacy",
      "terms",
      "retention",
    ] as const),
    version: "1.0",
    effective_at: new Date().toISOString(),
    expires_at: null,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    document_uri: "https://docs.org/legal.pdf",
    document_hash: RandomGenerator.alphaNumeric(32),
  } satisfies IHealthcarePlatformPolicyVersion.ICreate;
  const created =
    await api.functional.healthcarePlatform.systemAdmin.policyVersions.create(
      connection,
      { body: policyCreateBody },
    );
  typia.assert(created);

  // Step 3: Update policy version (good case)
  const updateBodyGood = {
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    document_uri: "https://docs.org/legal-updated.pdf",
  } satisfies IHealthcarePlatformPolicyVersion.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.systemAdmin.policyVersions.update(
      connection,
      {
        policyVersionId: created.id,
        body: updateBodyGood,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "expires_at updated",
    updated.expires_at,
    updateBodyGood.expires_at,
  );
  TestValidator.equals(
    "document_uri updated",
    updated.document_uri,
    updateBodyGood.document_uri,
  );
  TestValidator.predicate(
    "updated_at newer than created_at",
    new Date(updated.updated_at).getTime() >
      new Date(updated.created_at).getTime(),
  );
  TestValidator.equals(
    "organization_id unchanged",
    updated.organization_id,
    policyCreateBody.organization_id,
  );

  // Step 4: Business validation, attempt update with past expires_at
  const updateBodyInvalidPast = {
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IHealthcarePlatformPolicyVersion.IUpdate;
  await TestValidator.error("invalid past expires_at blocked", async () => {
    await api.functional.healthcarePlatform.systemAdmin.policyVersions.update(
      connection,
      {
        policyVersionId: created.id,
        body: updateBodyInvalidPast,
      },
    );
  });

  // Step 5: Non-existent policyVersionId fails update
  const bogusId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent policyVersionId blocked",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.policyVersions.update(
        connection,
        {
          policyVersionId: bogusId,
          body: updateBodyGood,
        },
      );
    },
  );

  // Step 6: Unauthenticated user cannot update (headers: {})
  const connUnauth: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated user cannot update", async () => {
    await api.functional.healthcarePlatform.systemAdmin.policyVersions.update(
      connUnauth,
      {
        policyVersionId: created.id,
        body: updateBodyGood,
      },
    );
  });
}
