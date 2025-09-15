import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformInsuranceClaim } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaim";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Validate retrieval of an insurance claim as org admin (success and forbidden
 * cases).
 *
 * 1. Register/login orgA admin
 * 2. Create patient and invoice
 * 3. Create insurance policy for patient
 * 4. Create insurance claim (get claimId)
 * 5. As orgA: GET the claim and check data matches
 * 6. Register/login orgB admin
 * 7. As orgB: GET the claim by ID -- should be forbidden or not found
 */
export async function test_api_insurance_claim_retrieval_by_org_admin_authenticated_success_and_forbidden_cases(
  connection: api.IConnection,
) {
  // Organization admin A registration/login
  const orgA_email = typia.random<string & tags.Format<"email">>();
  const orgA_full_name = RandomGenerator.name();
  const orgA_password = "test-pass-1234";

  const orgA = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgA_email,
      full_name: orgA_full_name,
      password: orgA_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(orgA);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgA_email,
      password: orgA_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Create patient under orgA
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1990-01-01T00:00:00Z").toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  // Create billing invoice for patient
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: orgA.id,
          patient_id: patient.id,
          invoice_number: RandomGenerator.alphaNumeric(16),
          status: "draft",
          total_amount: 500,
          currency: "USD",
          description: RandomGenerator.paragraph(),
          encounter_id: null,
          due_date: null,
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(invoice);

  // Create insurance policy for patient
  const todayDate = new Date();
  const coverage_start = todayDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const policy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: {
          patient_id: patient.id,
          organization_id: orgA.id,
          policy_number: RandomGenerator.alphaNumeric(10),
          payer_name: RandomGenerator.name(2),
          group_number: RandomGenerator.alphaNumeric(6),
          coverage_start_date: coverage_start as string & tags.Format<"date">,
          coverage_end_date: null,
          plan_type: "commercial",
          policy_status: "active",
        } satisfies IHealthcarePlatformInsurancePolicy.ICreate,
      },
    );
  typia.assert(policy);

  // Create an insurance claim linked to policy and invoice
  const service_start_date = new Date().toISOString();
  const claim_create = {
    insurance_policy_id: policy.id,
    invoice_id: invoice.id,
    claim_number: RandomGenerator.alphaNumeric(10),
    service_start_date,
    service_end_date: null,
    total_claimed_amount: 500,
    submission_status: "submitted",
    last_payer_response_code: null,
    last_payer_response_description: null,
  } satisfies IHealthcarePlatformInsuranceClaim.ICreate;
  const claim =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      { body: claim_create },
    );
  typia.assert(claim);

  // As orgA: retrieve the insurance claim by ID
  const fetchedClaim =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.at(
      connection,
      { insuranceClaimId: claim.id },
    );
  typia.assert(fetchedClaim);

  // Validate fetched claim matches created claim (IDs and main fields)
  TestValidator.equals("insurance claim ID matches", fetchedClaim.id, claim.id);
  TestValidator.equals(
    "insurance_policy_id matches",
    fetchedClaim.insurance_policy_id,
    claim.insurance_policy_id,
  );
  TestValidator.equals(
    "invoice_id matches",
    fetchedClaim.invoice_id,
    claim.invoice_id,
  );
  TestValidator.equals(
    "claim_number matches",
    fetchedClaim.claim_number,
    claim.claim_number,
  );
  TestValidator.equals(
    "total_claimed_amount matches",
    fetchedClaim.total_claimed_amount,
    claim.total_claimed_amount,
  );
  TestValidator.equals(
    "submission_status matches",
    fetchedClaim.submission_status,
    claim_create.submission_status,
  );

  // Register and login as a different org admin (orgB)
  const orgB_email = typia.random<string & tags.Format<"email">>();
  const orgB_full_name = RandomGenerator.name();
  const orgB_password = "test-pass-5678";

  const orgB = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgB_email,
      full_name: orgB_full_name,
      password: orgB_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(orgB);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgB_email,
      password: orgB_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Attempt to access orgA's insurance claim as orgB (should error)
  await TestValidator.error(
    "cross-organization claim access should be forbidden",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.at(
        connection,
        { insuranceClaimId: claim.id },
      );
    },
  );
}
