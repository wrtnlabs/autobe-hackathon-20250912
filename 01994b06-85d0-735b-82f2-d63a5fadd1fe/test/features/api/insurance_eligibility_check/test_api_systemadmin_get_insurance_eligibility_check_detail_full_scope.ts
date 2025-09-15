import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin access and detail retrieval for insurance
 * eligibility checks across organizations.
 *
 * This test verifies the following workflow:
 *
 * 1. System admin and organization admin accounts are created.
 * 2. As org admin, create a new insurance policy for a unique patient in an
 *    organization.
 * 3. As org admin, add a new eligibility check entry under this policy.
 * 4. Switch authentication to the system admin session.
 * 5. As system admin, retrieve the eligibility check detail by providing both
 *    insurancePolicyId and insuranceEligibilityCheckId.
 * 6. Assert that the retrieved record matches the original check; includes all
 *    audit fields, and crossing org boundaries is allowed for system
 *    admin.
 * 7. Switch back to the org admin session, and attempt to retrieve the same
 *    eligibility check using the system admin endpoint (should fail for
 *    non-system-admin with 403/404/error).
 * 8. All API responses are type-asserted for correctness.
 * 9. Authorization enforcement is validated for non-system-admin roles.
 */
export async function test_api_systemadmin_get_insurance_eligibility_check_detail_full_scope(
  connection: api.IConnection,
) {
  // 1. Register test users: system admin and organization admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  // system admin registration
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);

  // org admin registration
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // Authenticate as org admin for resource creation
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Org admin creates insurance policy for a new patient/org
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const insurancePolicy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: {
          patient_id: patientId,
          organization_id: organizationId,
          policy_number: RandomGenerator.alphaNumeric(8),
          payer_name: RandomGenerator.name(2),
          plan_type: RandomGenerator.pick([
            "commercial",
            "medicare",
            "medicaid",
            "self-pay",
            "worker_comp",
            "auto",
          ] as const),
          policy_status: RandomGenerator.pick([
            "active",
            "inactive",
            "expired",
            "pending verification",
          ] as const),
          coverage_start_date: new Date().toISOString().slice(0, 10),
          coverage_end_date: null,
          group_number: null,
        } satisfies IHealthcarePlatformInsurancePolicy.ICreate,
      },
    );
  typia.assert(insurancePolicy);

  // 3. Org admin adds insurance eligibility check
  const eligibilityCheck =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.insuranceEligibilityChecks.create(
      connection,
      {
        insurancePolicyId: insurancePolicy.id,
        body: {
          insurance_policy_id: insurancePolicy.id,
          performed_by_id: orgAdmin.id,
          check_timestamp: new Date().toISOString(),
          status: RandomGenerator.pick([
            "verified",
            "not_covered",
            "expired",
            "pending",
            "error",
            "partial",
          ] as const),
          payer_response_code: RandomGenerator.alphaNumeric(6),
          payer_response_description: RandomGenerator.paragraph({
            sentences: 3,
          }),
        } satisfies IHealthcarePlatformInsuranceEligibilityCheck.ICreate,
      },
    );
  typia.assert(eligibilityCheck);

  // Save reference to relevant IDs
  const insurancePolicyId = insurancePolicy.id;
  const insuranceEligibilityCheckId = eligibilityCheck.id as string &
    tags.Format<"uuid">;

  // 4. Switch to system admin session
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPassword,
      provider: "local",
      provider_key: sysAdminEmail,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 5. System admin gets eligibility check detail
  const eligibilityCheckDetail =
    await api.functional.healthcarePlatform.systemAdmin.insurancePolicies.insuranceEligibilityChecks.at(
      connection,
      {
        insurancePolicyId,
        insuranceEligibilityCheckId,
      },
    );
  typia.assert(eligibilityCheckDetail);
  TestValidator.equals(
    "eligibility check detail record matches original",
    eligibilityCheckDetail.insurance_policy_id,
    insurancePolicy.id,
  );
  TestValidator.equals(
    "eligibility check id matches original",
    eligibilityCheckDetail.id,
    eligibilityCheck.id,
  );

  // 6. System admin can cross org boundaries
  TestValidator.equals(
    "system admin can access eligibility check across orgs",
    eligibilityCheckDetail.insurance_policy_id,
    insurancePolicy.id,
  );

  // 7. Switch back to org admin, attempt system admin endpoint (should not have access - error expected)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "org admin cannot use system admin endpoint to get eligibility check detail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.insurancePolicies.insuranceEligibilityChecks.at(
        connection,
        {
          insurancePolicyId,
          insuranceEligibilityCheckId,
        },
      );
    },
  );
}
