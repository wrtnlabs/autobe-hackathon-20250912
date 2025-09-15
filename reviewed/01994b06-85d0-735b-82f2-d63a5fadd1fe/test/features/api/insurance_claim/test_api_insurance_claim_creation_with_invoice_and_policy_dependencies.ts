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
 * Test that an organization administrator can create insurance claims with
 * correct invoice and policy links, and that cross-organization resource
 * access is prevented.
 *
 * Steps:
 *
 * 1. Onboard and login as organization admin (orgA)
 * 2. Create patient (orgA)
 * 3. Create billing invoice for the patient (orgA)
 * 4. Create insurance policy for that patient (orgA)
 * 5. Create an insurance claim using the invoice and policy (orgA). Validate
 *    successful creation and links.
 * 6. Onboard and login as another organization admin (orgB)
 * 7. Create another patient (orgB)
 * 8. Create invoice and policy with this patient (orgB)
 * 9. Try claim creation as orgA admin using orgB's invoice, orgA's policy —
 *    expect permission error
 * 10. Try claim creation as orgA admin using orgA's invoice, orgB's policy —
 *     expect permission error
 */
export async function test_api_insurance_claim_creation_with_invoice_and_policy_dependencies(
  connection: api.IConnection,
) {
  // 1. Register orgA admin
  const orgA_email = typia.random<string & tags.Format<"email">>();
  const orgA_password = RandomGenerator.alphaNumeric(10);
  const orgA_full_name = RandomGenerator.name();
  const orgA_admin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgA_email,
        full_name: orgA_full_name,
        password: orgA_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgA_admin);

  // 2. Login as orgA admin for context
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgA_email,
      password: orgA_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Create patient (orgA)
  const patientA_email = typia.random<string & tags.Format<"email">>();
  const patientA =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientA_email,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(1992, 1, 15).toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patientA);

  // 4. Create billing invoice for patient (orgA)
  const invoiceA =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: orgA_admin.id,
          patient_id: patientA.id,
          invoice_number: RandomGenerator.alphaNumeric(12),
          status: "draft",
          total_amount: 2000,
          currency: "USD",
          description: RandomGenerator.paragraph(),
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(invoiceA);

  // 5. Create insurance policy for patient (orgA)
  const policyA =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: {
          patient_id: patientA.id,
          organization_id: orgA_admin.id,
          policy_number: RandomGenerator.alphaNumeric(10),
          payer_name: RandomGenerator.paragraph({ sentences: 2 }),
          coverage_start_date: "2020-01-01",
          coverage_end_date: "2030-12-31",
          plan_type: "commercial",
          policy_status: "active",
        } satisfies IHealthcarePlatformInsurancePolicy.ICreate,
      },
    );
  typia.assert(policyA);

  // 6. Create insurance claim (orgA)
  const claim_numberA = RandomGenerator.alphaNumeric(14);
  const service_start_dateA = new Date().toISOString();
  const insuranceClaimA =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      {
        body: {
          insurance_policy_id: policyA.id,
          invoice_id: invoiceA.id,
          claim_number: claim_numberA,
          service_start_date: service_start_dateA,
          total_claimed_amount: 2000,
          submission_status: "submitted",
        } satisfies IHealthcarePlatformInsuranceClaim.ICreate,
      },
    );
  typia.assert(insuranceClaimA);
  TestValidator.equals(
    "insurance_claim links to correct invoice",
    insuranceClaimA.invoice_id,
    invoiceA.id,
  );
  TestValidator.equals(
    "insurance_claim links to correct policy",
    insuranceClaimA.insurance_policy_id,
    policyA.id,
  );
  TestValidator.equals(
    "insurance_claim claim_number matches",
    insuranceClaimA.claim_number,
    claim_numberA,
  );

  // 7. Register orgB admin
  const orgB_email = typia.random<string & tags.Format<"email">>();
  const orgB_password = RandomGenerator.alphaNumeric(10);
  const orgB_full_name = RandomGenerator.name();
  const orgB_admin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgB_email,
        full_name: orgB_full_name,
        password: orgB_password,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgB_admin);

  // 8. Login as orgB admin for context
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgB_email,
      password: orgB_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 9. Create patient and invoice/policy for orgB
  const patientB_email = typia.random<string & tags.Format<"email">>();
  const patientB =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: patientB_email,
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(1985, 4, 21).toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patientB);

  const invoiceB =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: orgB_admin.id,
          patient_id: patientB.id,
          invoice_number: RandomGenerator.alphaNumeric(12),
          status: "draft",
          total_amount: 3500,
          currency: "USD",
          description: RandomGenerator.paragraph(),
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(invoiceB);

  const policyB =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: {
          patient_id: patientB.id,
          organization_id: orgB_admin.id,
          policy_number: RandomGenerator.alphaNumeric(10),
          payer_name: RandomGenerator.paragraph({ sentences: 2 }),
          coverage_start_date: "2015-05-01",
          coverage_end_date: "2025-12-31",
          plan_type: "commercial",
          policy_status: "active",
        } satisfies IHealthcarePlatformInsurancePolicy.ICreate,
      },
    );
  typia.assert(policyB);

  // 10. Switch back to orgA admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgA_email,
      password: orgA_password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 11. Try claim creation using orgB's invoice + orgA's policy (should error)
  await TestValidator.error(
    "forbidden if invoice or policy not in orgA - using orgB's invoice",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
        connection,
        {
          body: {
            insurance_policy_id: policyA.id,
            invoice_id: invoiceB.id,
            claim_number: RandomGenerator.alphaNumeric(16),
            service_start_date: new Date().toISOString(),
            total_claimed_amount: 999,
            submission_status: "submitted",
          } satisfies IHealthcarePlatformInsuranceClaim.ICreate,
        },
      );
    },
  );
  // 12. Try claim creation using orgA's invoice + orgB's policy (should error)
  await TestValidator.error(
    "forbidden if invoice or policy not in orgA - using orgB's policy",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
        connection,
        {
          body: {
            insurance_policy_id: policyB.id,
            invoice_id: invoiceA.id,
            claim_number: RandomGenerator.alphaNumeric(16),
            service_start_date: new Date().toISOString(),
            total_claimed_amount: 999,
            submission_status: "submitted",
          } satisfies IHealthcarePlatformInsuranceClaim.ICreate,
        },
      );
    },
  );
}
