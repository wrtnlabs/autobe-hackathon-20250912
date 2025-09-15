import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";

/**
 * Organization admin updates an existing policy version's metadata (title,
 * document_uri, expires_at, etc.).
 *
 * Covers the following workflow:
 *
 * 1. Register OrgA admin; log in and create a policy version (PV1) for OrgA.
 * 2. Update PV1 with new title/URI/expiration: expect success (check updated
 *    fields).
 * 3. Attempt update with expires_at before effective_at (expect error).
 * 4. Attempt to change version+policy_type to an existing combo (expect error).
 * 5. Attempt update on random (non-existent) policyVersionId (expect error).
 * 6. Register OrgB admin; attempt update on OrgA's PV1 (expect error).
 * 7. Attempt update as ordinary (unauthenticated) user (expect error).
 */
export async function test_api_policy_version_update_by_organization_admin(
  connection: api.IConnection,
) {
  // Step 1: Register OrgA admin
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminAEmail,
        full_name: RandomGenerator.name(),
        password: "OrgApass123!",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminAJoin);
  const orgAAdminEmail = adminAJoin.email;

  // Step 2: (Re-)login as OrgA admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAAdminEmail,
      password: "OrgApass123!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Step 3: Create PV1 for orgA
  const createBody = {
    organization_id: typia.random<string & tags.Format<"uuid">>(), // simulate org linkage
    policy_type: RandomGenerator.pick([
      "privacy",
      "consent",
      "terms",
      "security",
    ] as const),
    version: "1.0.0",
    effective_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    document_uri: `https://docs.example.com/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IHealthcarePlatformPolicyVersion.ICreate;
  const pv1 =
    await api.functional.healthcarePlatform.organizationAdmin.policyVersions.create(
      connection,
      { body: createBody },
    );
  typia.assert(pv1);

  // Step 4: Update PV1's metadata (title and URI)
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newUri = `https://docs.example.com/${RandomGenerator.alphaNumeric(8)}`;
  const newExpires = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 100,
  ).toISOString();
  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.policyVersions.update(
      connection,
      {
        policyVersionId: pv1.id,
        body: {
          title: newTitle,
          document_uri: newUri,
          expires_at: newExpires,
        } satisfies IHealthcarePlatformPolicyVersion.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated policyVersion.id unchanged",
    updated.id,
    pv1.id,
  );
  TestValidator.equals("updated title", updated.title, newTitle);
  TestValidator.equals("updated URI", updated.document_uri, newUri);
  TestValidator.equals("updated expires_at", updated.expires_at, newExpires);

  // Step 5: Attempt update with expires_at before effective_at (should error)
  await TestValidator.error(
    "expires_at before effective_at is invalid",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.policyVersions.update(
        connection,
        {
          policyVersionId: pv1.id,
          body: {
            expires_at: new Date(
              Date.parse(updated.effective_at) - 3600,
            ).toISOString(),
          } satisfies IHealthcarePlatformPolicyVersion.IUpdate,
        },
      );
    },
  );

  // Step 6: Attempt duplicate version+policy_type combo (should error)
  // Create a new PV2 first for the duplicate attempt
  const pv2 =
    await api.functional.healthcarePlatform.organizationAdmin.policyVersions.create(
      connection,
      {
        body: {
          organization_id: createBody.organization_id, // same org
          policy_type: createBody.policy_type, // same type
          version: "2.0.0",
          effective_at: new Date(Date.now() + 20000000).toISOString(),
          expires_at: new Date(Date.now() + 30000000).toISOString(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          document_uri: `https://docs.example.com/${RandomGenerator.alphaNumeric(8)}`,
        } satisfies IHealthcarePlatformPolicyVersion.ICreate,
      },
    );
  typia.assert(pv2);
  await TestValidator.error(
    "duplicate version+policy_type should throw",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.policyVersions.update(
        connection,
        {
          policyVersionId: pv2.id,
          body: {
            version: createBody.version, // try to make it 1.0.0 again
          } satisfies IHealthcarePlatformPolicyVersion.IUpdate,
        },
      );
    },
  );

  // Step 7: Attempt update with random (non-existent) policyVersionId
  await TestValidator.error(
    "update on non-existent policyVersionId should throw",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.policyVersions.update(
        connection,
        {
          policyVersionId: typia.random<string & tags.Format<"uuid">>(), // random UUID
          body: {
            title: "no effect",
          } satisfies IHealthcarePlatformPolicyVersion.IUpdate,
        },
      );
    },
  );

  // Step 8: Register and login as OrgB admin, attempt update on OrgA's policyVersion
  const orgBAdminEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgBAdminEmail,
      full_name: RandomGenerator.name(),
      password: "OrgBpass123!",
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgBAdminEmail,
      password: "OrgBpass123!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "organizationB admin should not update OrgA's PV1",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.policyVersions.update(
        connection,
        {
          policyVersionId: pv1.id,
          body: {
            title: "should not update",
          } satisfies IHealthcarePlatformPolicyVersion.IUpdate,
        },
      );
    },
  );

  // Step 9: Attempt update as ordinary user (simulate unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update policyVersion",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.policyVersions.update(
        unauthConn,
        {
          policyVersionId: pv1.id,
          body: {
            title: "unauth update attempt",
          } satisfies IHealthcarePlatformPolicyVersion.IUpdate,
        },
      );
    },
  );
}
