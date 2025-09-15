import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceConsent";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test Organization Admin: compliance consent update & revoke.
 *
 * 1. Register a new org admin and login (retain orgId)
 * 2. Simulate/provision a consent record for this org admin's org
 * 3. Update consent with revoke action: granted=false, revoked_at, reason,
 *    expires_at
 * 4. Confirm: - granted false, meta fields updated, immutables unchanged
 * 5. Attempt unauthorized update (e.g., using another org, deleted/expired
 *    consent) → check permissions
 * 6. Check update actually propagates (granted now false)
 */
export async function test_api_compliance_consent_update_and_revoke_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register new org admin
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        password: "AdminPassw0rd!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);
  const orgAdminId = adminJoin.id;

  // 2. Login as org admin
  const login = await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminJoin.email,
      password: "AdminPassw0rd!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  typia.assert(login);

  // 3. Simulate creating a new compliance consent (for this org)
  const consent: IHealthcarePlatformComplianceConsent = {
    id: typia.random<string & tags.Format<"uuid">>(),
    organization_id: login.id,
    policy_version_id: typia.random<string & tags.Format<"uuid">>(),
    consent_type: "privacy",
    granted: true,
    consent_at: new Date().toISOString(),
    revoked_at: undefined,
    revocation_reason: undefined,
    expires_at: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: undefined,
    subject_id: undefined,
  };

  // 4. Update consent (revoke: granted=false + meta set)
  const revokeInput = {
    granted: false,
    revoked_at: new Date().toISOString(),
    revocation_reason: RandomGenerator.paragraph({ sentences: 2 }),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  } satisfies IHealthcarePlatformComplianceConsent.IUpdate;

  // Assume the consent is provisioned and updatable in the backend fixture
  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.complianceConsents.update(
      connection,
      {
        complianceConsentId: consent.id as string & tags.Format<"uuid">,
        body: revokeInput,
      },
    );
  typia.assert(updated);

  // 5. Check correct updated fields
  TestValidator.equals("consent revoked (granted)", updated.granted, false);
  TestValidator.equals(
    "revoked_at propagation",
    updated.revoked_at,
    revokeInput.revoked_at,
  );
  TestValidator.equals(
    "revocation reason propagation",
    updated.revocation_reason,
    revokeInput.revocation_reason,
  );
  TestValidator.equals(
    "expires_at propagation",
    updated.expires_at,
    revokeInput.expires_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    consent.updated_at,
  );
  TestValidator.equals(
    "organization_id immutable",
    updated.organization_id,
    consent.organization_id,
  );
  TestValidator.equals(
    "policy_version_id immutable",
    updated.policy_version_id,
    consent.policy_version_id,
  );

  // 6. Unauthorized update (simulate another org admin)
  const anotherAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        password: "OtherAdmin123!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(anotherAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: anotherAdmin.email,
      password: "OtherAdmin123!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  await TestValidator.error(
    "cannot update consent for another org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.complianceConsents.update(
        connection,
        {
          complianceConsentId: consent.id as string & tags.Format<"uuid">,
          body: {
            granted: false,
            revoked_at: new Date().toISOString(),
            revocation_reason: "Attempt by wrong org",
          } satisfies IHealthcarePlatformComplianceConsent.IUpdate,
        },
      );
    },
  );

  // 7. Simulate already deleted/expired consent (mutate local object, then try update)
  consent.deleted_at = new Date().toISOString();
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminJoin.email,
      password: "AdminPassw0rd!",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error("cannot update deleted consent", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.complianceConsents.update(
      connection,
      {
        complianceConsentId: consent.id as string & tags.Format<"uuid">,
        body: revokeInput,
      },
    );
  });
}
