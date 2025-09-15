import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";

/**
 * Validate deletion of an org-scoped policy version by the owning organization
 * admin.
 *
 * Test workflow:
 *
 * 1. Register and login as org admin (Org A).
 * 2. Create a policy version and record id.
 * 3. Delete the policy version and confirm success.
 * 4. Attempt to delete again and expect 404 (not found).
 * 5. Attempt delete on random uuid and expect 404 (not found).
 * 6. Register a second org admin (Org B), create another policy version in Org B,
 *    and confirm Org A admin cannot delete Org B's version
 *    (forbidden/unauthorized).
 * 7. Attempt deletion as unauthenticated user and expect error.
 */
export async function test_api_policy_version_delete_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register Org Admin A
  const orgA_email = typia.random<string & tags.Format<"email">>();
  const orgA_password = RandomGenerator.alphaNumeric(12);
  const orgA_fullName = RandomGenerator.name();

  const orgA_admin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgA_email,
        full_name: orgA_fullName,
        password: orgA_password,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgA_admin);

  // 2. Login Org Admin A to ensure token
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgA_email,
      password: orgA_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Org A creates a policy version
  const policyVersionA =
    await api.functional.healthcarePlatform.organizationAdmin.policyVersions.create(
      connection,
      {
        body: {
          organization_id: orgA_admin.id,
          policy_type: RandomGenerator.paragraph({ sentences: 2 }),
          version: RandomGenerator.alphaNumeric(8),
          effective_at: new Date().toISOString(),
          expires_at: null,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          document_uri: `https://docs.example.com/${RandomGenerator.alphaNumeric(10)}`,
          document_hash: RandomGenerator.alphaNumeric(32),
        } satisfies IHealthcarePlatformPolicyVersion.ICreate,
      },
    );
  typia.assert(policyVersionA);

  // 4. Delete the policy version as Org Admin A
  await api.functional.healthcarePlatform.organizationAdmin.policyVersions.erase(
    connection,
    {
      policyVersionId: policyVersionA.id,
    },
  );

  // 5. Attempt to delete again (should return 404)
  await TestValidator.error(
    "attempting to delete already-deleted policy version should return 404",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.policyVersions.erase(
        connection,
        {
          policyVersionId: policyVersionA.id,
        },
      );
    },
  );

  // 6. Attempt to delete non-existent (random) policy version id (should return 404)
  await TestValidator.error(
    "attempting to delete completely non-existent policy version id should return 404",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.policyVersions.erase(
        connection,
        {
          policyVersionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 7. Register Org Admin B for security check
  const orgB_email = typia.random<string & tags.Format<"email">>();
  const orgB_password = RandomGenerator.alphaNumeric(12);
  const orgB_fullName = RandomGenerator.name();

  const orgB_admin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgB_email,
        full_name: orgB_fullName,
        password: orgB_password,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgB_admin);

  // Org B login to gain token
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgB_email,
      password: orgB_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Org B creates their own policy version
  const policyVersionB =
    await api.functional.healthcarePlatform.organizationAdmin.policyVersions.create(
      connection,
      {
        body: {
          organization_id: orgB_admin.id,
          policy_type: RandomGenerator.paragraph({ sentences: 2 }),
          version: RandomGenerator.alphaNumeric(8),
          effective_at: new Date().toISOString(),
          expires_at: null,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          document_uri: `https://docs.example.com/${RandomGenerator.alphaNumeric(10)}`,
          document_hash: RandomGenerator.alphaNumeric(32),
        } satisfies IHealthcarePlatformPolicyVersion.ICreate,
      },
    );
  typia.assert(policyVersionB);

  // Attempt to delete Org B's policy version as Org A admin (should be forbidden/unauthorized)
  // First log back in as Org A admin to restore proper session
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgA_email,
      password: orgA_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  await TestValidator.error(
    "org admin A cannot delete policy version belonging to org B",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.policyVersions.erase(
        connection,
        {
          policyVersionId: policyVersionB.id,
        },
      );
    },
  );

  // 8. Attempt deletion as unauthenticated user (no token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot perform policy version deletion",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.policyVersions.erase(
        unauthConn,
        {
          policyVersionId: policyVersionA.id,
        },
      );
    },
  );
}
