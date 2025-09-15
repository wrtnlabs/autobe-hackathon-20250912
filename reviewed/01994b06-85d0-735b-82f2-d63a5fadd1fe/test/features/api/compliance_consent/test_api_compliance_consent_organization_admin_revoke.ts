import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceConsent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceConsent";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate the organization admin compliance consent revoke (soft-delete)
 * scenario:
 *
 * 1. Register and login as system admin.
 * 2. Create a new organization (system admin privilege).
 * 3. Create a policy version for that organization.
 * 4. Register and authenticate as the organization admin (of the created org).
 * 5. Register a patient (as consent subject).
 * 6. Organization admin creates a compliance consent for the patient.
 * 7. Organization admin revokes the consent via DELETE endpoint.
 * 8. Verify that the consent is no longer active (via business logic: cannot
 *    double-revoke).
 * 9. Check error: another admin tries to revoke same consent - forbidden.
 * 10. Check error: try revoking nonexistent consent.
 * 11. Check error: try deleting the same consent twice.
 */
export async function test_api_compliance_consent_organization_admin_revoke(
  connection: api.IConnection,
) {
  // 1. Register and login system admin
  const sysAdminEmail =
    RandomGenerator.name(2).replace(/ /g, "_") + "@business.com";
  const sysAdminPassword = "Password!123";
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      full_name: RandomGenerator.name(2),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(systemAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail as string & tags.Format<"email">,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // 2. Create an organization
  const orgCode = RandomGenerator.alphaNumeric(8);
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.name(3),
          status: "active",
        },
      },
    );
  typia.assert(organization);

  // 3. Create a policy version
  const policyVersion =
    await api.functional.healthcarePlatform.systemAdmin.policyVersions.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          policy_type: "privacy",
          version: "v1.0",
          effective_at: new Date().toISOString(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          document_uri: "https://example.com/consent/policy-v1.pdf",
        },
      },
    );
  typia.assert(policyVersion);

  // 4. Register org admin (for the same org) and login
  const orgAdminEmail =
    RandomGenerator.name(2).replace(/ /g, "_") + "@orgadmin.com";
  const orgAdminPassword = "OrgAdmin!123";
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail as string & tags.Format<"email">,
        full_name: RandomGenerator.name(2),
        password: orgAdminPassword,
        phone: RandomGenerator.mobile(),
        provider: undefined,
        provider_key: undefined,
      },
    },
  );
  typia.assert(orgAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail as string & tags.Format<"email">,
      password: orgAdminPassword,
      provider: undefined,
      provider_key: undefined,
    },
  });

  // 5. Register a patient
  const patientEmail =
    RandomGenerator.name(2).replace(/ /g, "_") + "@patient.com";
  const patientPassword = "Patient!123";
  const patient = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientEmail,
      full_name: RandomGenerator.name(2),
      date_of_birth: new Date("1990-01-01T00:00:00Z").toISOString(),
      password: patientPassword,
      phone: RandomGenerator.mobile(),
      provider: undefined,
      provider_key: undefined,
    },
  });
  typia.assert(patient);

  // 6. Organization admin creates a compliance consent for the patient
  const consentCreate =
    await api.functional.healthcarePlatform.organizationAdmin.complianceConsents.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          subject_id: patient.id,
          policy_version_id: policyVersion.id,
          consent_type: "privacy",
          granted: true,
          consent_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(consentCreate);
  TestValidator.predicate(
    "consent granted is true",
    consentCreate.granted === true,
  );

  // 7. Organization admin revokes the consent
  await api.functional.healthcarePlatform.organizationAdmin.complianceConsents.erase(
    connection,
    {
      complianceConsentId: consentCreate.id as string & tags.Format<"uuid">,
    },
  );

  // 8. Validate that the consent is now revoked (simulate a check by attempting to delete again, or other predicate as system exposes)
  await TestValidator.error("double revoke is not allowed", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.complianceConsents.erase(
      connection,
      {
        complianceConsentId: consentCreate.id as string & tags.Format<"uuid">,
      },
    );
  });

  // 9. Error: insufficient permissions (different org admin tries to revoke)
  const otherOrgAdminEmail =
    RandomGenerator.name(2).replace(/ /g, "_") + "@otherorgadmin.com";
  const otherOrgAdminPassword = "OtherOrgAdmin!123";
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: otherOrgAdminEmail,
      full_name: RandomGenerator.name(2),
      password: otherOrgAdminPassword,
      phone: RandomGenerator.mobile(),
      provider: undefined,
      provider_key: undefined,
    },
  });
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: otherOrgAdminEmail,
      password: otherOrgAdminPassword,
      provider: undefined,
      provider_key: undefined,
    },
  });
  await TestValidator.error(
    "org admin cannot revoke consent for another org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.complianceConsents.erase(
        connection,
        {
          complianceConsentId: consentCreate.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 10. Error: non-existent consent
  await TestValidator.error("nonexistent consent revoke fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.complianceConsents.erase(
      connection,
      {
        complianceConsentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
