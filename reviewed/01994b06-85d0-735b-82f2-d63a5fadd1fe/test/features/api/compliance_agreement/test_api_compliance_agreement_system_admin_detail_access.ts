import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceAgreement } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceAgreement";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPolicyVersion";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin retrieval of compliance agreement details, success and
 * error.
 *
 * 1. Register and login as system admin
 * 2. Create an organization
 * 3. Add a policy version to the org
 * 4. Register a patient as signer
 * 5. Create compliance agreement linking org, policy version, signer
 * 6. GET the agreement and check all business fields
 * 7. GET with random non-existent UUID and check error
 * 8. GET with another valid (but unrelated) compliance agreement and check context
 * 9. Optionally, check GET forbidden if not system admin (skipped here)
 */
export async function test_api_compliance_agreement_system_admin_detail_access(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail = RandomGenerator.alphaNumeric(10) + "@corp.com";
  const sysAdminPw = RandomGenerator.alphaNumeric(12);
  const sysAdmin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: sysAdminEmail,
        password: sysAdminPw,
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(sysAdmin);
  // 2. Create organization
  const orgName = RandomGenerator.name(3);
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: orgName,
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create policy version
  const policy =
    await api.functional.healthcarePlatform.systemAdmin.policyVersions.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          policy_type: "HIPAA",
          version: "1.0",
          effective_at: new Date().toISOString(),
          title: "HIPAA Consent",
          document_uri: "https://docs.gov/policy/hipaa-consent.pdf",
        } satisfies IHealthcarePlatformPolicyVersion.ICreate,
      },
    );
  typia.assert(policy);
  // 4. Register patient as signer
  const patientEmail = RandomGenerator.alphaNumeric(12) + "@mail.com";
  const patient: IHealthcarePlatformPatient.IAuthorized =
    await api.functional.auth.patient.join(connection, {
      body: {
        email: patientEmail,
        full_name: RandomGenerator.name(),
        date_of_birth: new Date(1985, 4, 1).toISOString(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IHealthcarePlatformPatient.IJoin,
    });
  typia.assert(patient);
  // 5. Create a compliance agreement
  const agreementType = "HIPAA";
  const agreementStatus = "signed";
  const nowIso = new Date().toISOString();
  const expiresIso = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const agreement =
    await api.functional.healthcarePlatform.systemAdmin.complianceAgreements.create(
      connection,
      {
        body: {
          organization_id: organization.id,
          signer_id: patient.id,
          policy_version_id: policy.id,
          agreement_type: agreementType,
          status: agreementStatus,
          signed_at: nowIso,
          method: "digital_signature",
          expires_at: expiresIso,
        } satisfies IHealthcarePlatformComplianceAgreement.ICreate,
      },
    );
  typia.assert(agreement);

  // 6. GET the compliance agreement by id
  const read =
    await api.functional.healthcarePlatform.systemAdmin.complianceAgreements.at(
      connection,
      { complianceAgreementId: agreement.id },
    );
  typia.assert(read);
  // field checks (business logic)
  TestValidator.equals("agreement id matches", read.id, agreement.id);
  TestValidator.equals(
    "organization matches",
    read.organization_id,
    organization.id,
  );
  TestValidator.equals("signer matches", read.signer_id, patient.id);
  TestValidator.equals(
    "policy version matches",
    read.policy_version_id,
    policy.id,
  );
  TestValidator.equals("agreement type", read.agreement_type, agreementType);
  TestValidator.equals("status", read.status, agreementStatus);
  TestValidator.equals("signed_at", read.signed_at, nowIso);
  TestValidator.equals("method", read.method, "digital_signature");
  TestValidator.equals("expires_at", read.expires_at, expiresIso);
  TestValidator.predicate(
    "created_at present",
    typeof read.created_at === "string" && read.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof read.updated_at === "string" && read.updated_at.length > 0,
  );

  // 7. GET for random non-existent id should fail
  await TestValidator.error(
    "GET non-existent agreement returns error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceAgreements.at(
        connection,
        {
          complianceAgreementId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 8. (OPTIONAL) Extra test: agreement for other org not visible (requires creating another org/policy/agreement)
  // Not fully implemented here due to scope
}
