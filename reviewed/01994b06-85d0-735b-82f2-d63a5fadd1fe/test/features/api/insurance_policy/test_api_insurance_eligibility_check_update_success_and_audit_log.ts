import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceEligibilityCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceEligibilityCheck";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * End-to-end test for updating an insurance eligibility check as organization
 * admin and validating update logic and audit sensitivity
 *
 * 1. Register and authenticate as an organization admin
 * 2. Create a random patient UUID (since patient entity management is not managed
 *    via provided API)
 * 3. Create insurance policy linked to organization and patient
 * 4. Create an eligibility check on the insurance policy
 * 5. Update allowed fields on the eligibility check (status, payer_response_code,
 *    payer_response_description)
 * 6. Validate that record is updated correctly: only allowed fields updated,
 *    timestamps updated, IDs unchanged
 */
export async function test_api_insurance_eligibility_check_update_success_and_audit_log(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: orgAdminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert(orgAdmin);
  const organization_id = typia.random<string & tags.Format<"uuid">>();

  // 2. Create simulated patient UUID
  const patient_id = typia.random<string & tags.Format<"uuid">>();

  // 3. Create insurance policy
  const insuranceCreateBody = {
    patient_id,
    organization_id,
    policy_number: RandomGenerator.alphaNumeric(10),
    payer_name: RandomGenerator.paragraph({ sentences: 2 }),
    group_number: RandomGenerator.alphaNumeric(6),
    coverage_start_date: new Date().toISOString().split("T")[0],
    coverage_end_date: null,
    plan_type: "commercial",
    policy_status: "active",
  } satisfies IHealthcarePlatformInsurancePolicy.ICreate;
  const insurancePolicy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: insuranceCreateBody,
      },
    );
  typia.assert(insurancePolicy);

  // 4. Create eligibility check
  const eligibilityCreateBody = {
    insurance_policy_id: insurancePolicy.id,
    performed_by_id: orgAdmin.id,
    check_timestamp: new Date().toISOString(),
    status: "pending",
    payer_response_code: null,
    payer_response_description: null,
  } satisfies IHealthcarePlatformInsuranceEligibilityCheck.ICreate;
  const eligibilityCheck =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.insuranceEligibilityChecks.create(
      connection,
      {
        insurancePolicyId: insurancePolicy.id,
        body: eligibilityCreateBody,
      },
    );
  typia.assert(eligibilityCheck);

  // 5. Update eligibility check (allowed fields only)
  const updateBody = {
    status: "verified",
    payer_response_code: "A23",
    payer_response_description: "Coverage verified for requested procedure",
  } satisfies IHealthcarePlatformInsuranceEligibilityCheck.IUpdate;
  const updatedCheck =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.insuranceEligibilityChecks.update(
      connection,
      {
        insurancePolicyId: insurancePolicy.id,
        insuranceEligibilityCheckId: eligibilityCheck.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCheck);

  // 6. Validate that fields updated as expected
  TestValidator.equals(
    "status is updated to 'verified'",
    updatedCheck.status,
    "verified",
  );
  TestValidator.equals(
    "payer_response_code updated correctly",
    updatedCheck.payer_response_code,
    "A23",
  );
  TestValidator.equals(
    "payer_response_description updated correctly",
    updatedCheck.payer_response_description,
    "Coverage verified for requested procedure",
  );
  TestValidator.equals(
    "eligibility check id remains unchanged",
    updatedCheck.id,
    eligibilityCheck.id,
  );
  TestValidator.equals(
    "insurance_policy_id remains unchanged",
    updatedCheck.insurance_policy_id,
    eligibilityCheck.insurance_policy_id,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedCheck.created_at,
    eligibilityCheck.created_at,
  );
  TestValidator.notEquals(
    "updated_at is changed on update",
    updatedCheck.updated_at,
    eligibilityCheck.updated_at,
  );
}
