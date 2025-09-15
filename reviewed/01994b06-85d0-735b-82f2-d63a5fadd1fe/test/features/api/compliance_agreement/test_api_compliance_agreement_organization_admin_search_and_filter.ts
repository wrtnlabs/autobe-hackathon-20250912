import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceAgreement } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceAgreement";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformComplianceAgreement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformComplianceAgreement";

/**
 * Advanced search and pagination E2E test for compliance agreements as
 * organization admin Validates all major search, filter, pagination, and
 * negative/authorization boundary cases.
 *
 * 1. Register and login a system admin to bootstrap org, policy, agreement records
 * 2. Register and login organization admin for search
 * 3. As system admin, create new organization
 * 4. As system admin, create new policy version for that org
 * 5. As system admin, register patient as signer
 * 6. As system admin, create compliance agreement binding organization, policy,
 *    and signer
 * 7. As organization admin, use PATCH search for the record (by organization_id,
 *    policy_version_id, signer_id, agreement_type, status)
 * 8. Validate filtering, pagination, and correct record inclusion
 * 9. Test negative search (wrong org id, wrong policy_version id, wrong signer id)
 * 10. Test unauthorized access (another org admin, for a different org)
 */
export async function test_api_compliance_agreement_organization_admin_search_and_filter(
  connection: api.IConnection,
) {
  // 1. System admin registration and login
  const sysAdminEmail = RandomGenerator.alphaNumeric(12) + "@biz.com";
  const sysAdminPassword = RandomGenerator.alphaNumeric(16);
  const sysAdminJoinBody = {
    email: sysAdminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: sysAdminEmail,
    password: sysAdminPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoinBody,
  });
  typia.assert(sysAdmin);

  // 2. Register and login organization admin
  const orgAdminEmail = RandomGenerator.alphaNumeric(12) + "@org.com";
  const orgAdminPassword = RandomGenerator.alphaNumeric(16);
  const orgAdminJoinBody = {
    email: orgAdminEmail,
    full_name: RandomGenerator.name(),
    password: orgAdminPassword,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminJoinBody },
  );
  typia.assert(orgAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: { email: orgAdminEmail, password: orgAdminPassword },
  });

  // 3. Switch to system admin for org/policy/agreement creation
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // 4. System admin creates organization
  const orgBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody },
    );
  typia.assert(organization);

  // 5. System admin creates policy version
  const policyVersionBody = {
    organization_id: organization.id,
    policy_type: "terms_of_service",
    version: "v1.0.0",
    effective_at: new Date().toISOString(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    document_uri: "https://example.com/policy/v1.0.0.pdf",
  } satisfies IHealthcarePlatformPolicyVersion.ICreate;
  const policy =
    await api.functional.healthcarePlatform.systemAdmin.policyVersions.create(
      connection,
      { body: policyVersionBody },
    );
  typia.assert(policy);

  // 6. System admin registers a patient for use as a signer
  const patientEmail = RandomGenerator.alphaNumeric(12) + "@user.com";
  const patientPassword = RandomGenerator.alphaNumeric(14);
  const patientJoinBody = {
    email: patientEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1990-01-01").toISOString(),
    password: patientPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patient = await api.functional.auth.patient.join(connection, {
    body: patientJoinBody,
  });
  typia.assert(patient);

  // 7. System admin: register compliance agreement
  const agreementType = "terms_of_service";
  const agreementStatus = "signed";
  const agreementBody = {
    organization_id: organization.id,
    signer_id: patient.id,
    policy_version_id: policy.id,
    agreement_type: agreementType,
    status: agreementStatus,
    signed_at: new Date().toISOString(),
    method: "digital_signature",
  } satisfies IHealthcarePlatformComplianceAgreement.ICreate;
  const agreement =
    await api.functional.healthcarePlatform.systemAdmin.complianceAgreements.create(
      connection,
      { body: agreementBody },
    );
  typia.assert(agreement);

  // 8. Switch to organization admin for search
  await api.functional.auth.organizationAdmin.login(connection, {
    body: { email: orgAdminEmail, password: orgAdminPassword },
  });

  // 9. Search by organization_id, policy_version_id, signer_id (positive test)
  const searchRequest = {
    organization_id: organization.id,
    policy_version_id: policy.id,
    signer_id: patient.id,
    agreement_type: agreementType,
    status: agreementStatus,
    page: 0,
    limit: 10,
  } satisfies IHealthcarePlatformComplianceAgreement.IRequest;
  const page =
    await api.functional.healthcarePlatform.organizationAdmin.complianceAgreements.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(page);
  TestValidator.predicate(
    "at least one agreement is returned by exact filters",
    page.data.length > 0,
  );
  const found = page.data.find((a) => a.id === agreement.id);
  typia.assertGuard(found!);
  TestValidator.equals(
    "agreement id matches in search results",
    found.id,
    agreement.id,
  );
  TestValidator.equals(
    "agreement organization id matches",
    found.organization_id,
    organization.id,
  );
  TestValidator.equals(
    "agreement type matches",
    found.agreement_type,
    agreementType,
  );
  TestValidator.equals(
    "agreement status matches",
    found.status,
    agreementStatus,
  );

  // 10. Pagination and limits
  TestValidator.equals(
    "limit matches in pagination",
    page.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records includes at least inserted agreement",
    page.pagination.records >= 1,
  );
  TestValidator.equals("current page is 0", page.pagination.current, 0);

  // 11. Search by only one filter: agreement_type
  const typeOnlyRequest = {
    agreement_type: agreementType,
    page: 0,
    limit: 10,
  } satisfies IHealthcarePlatformComplianceAgreement.IRequest;
  const typeOnlyPage =
    await api.functional.healthcarePlatform.organizationAdmin.complianceAgreements.index(
      connection,
      { body: typeOnlyRequest },
    );
  typia.assert(typeOnlyPage);
  TestValidator.predicate(
    "agreement exists in agreement_type search",
    ArrayUtil.has(typeOnlyPage.data, (a) => a.id === agreement.id),
  );

  // 12. Negative search: non-existent org, policy version, and signer ids
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  for (const req of [
    { organization_id: fakeId, page: 0, limit: 10 },
    { policy_version_id: fakeId, page: 0, limit: 10 },
    { signer_id: fakeId, page: 0, limit: 10 },
  ]) {
    const negativePage =
      await api.functional.healthcarePlatform.organizationAdmin.complianceAgreements.index(
        connection,
        { body: req },
      );
    typia.assert(negativePage);
    TestValidator.equals(
      "negative search: returns empty data",
      negativePage.data.length,
      0,
    );
  }

  // 13. Test cross-org access: create a second org+admin and confirm no record leak
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  const otherOrgBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const otherOrganization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: otherOrgBody },
    );
  typia.assert(otherOrganization);
  const otherAdminEmail = RandomGenerator.alphaNumeric(12) + "@another.com";
  const otherAdminPassword = RandomGenerator.alphaNumeric(16);
  const otherAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: otherAdminEmail,
        full_name: RandomGenerator.name(),
        password: otherAdminPassword,
      },
    },
  );
  typia.assert(otherAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: { email: otherAdminEmail, password: otherAdminPassword },
  });
  const crossSearchRequest = {
    organization_id: organization.id,
    page: 0,
    limit: 10,
  } satisfies IHealthcarePlatformComplianceAgreement.IRequest;
  const crossPage =
    await api.functional.healthcarePlatform.organizationAdmin.complianceAgreements.index(
      connection,
      { body: crossSearchRequest },
    );
  typia.assert(crossPage);
  TestValidator.equals(
    "cross-org admin CANNOT see agreements from other org",
    crossPage.data.length,
    0,
  );
}
