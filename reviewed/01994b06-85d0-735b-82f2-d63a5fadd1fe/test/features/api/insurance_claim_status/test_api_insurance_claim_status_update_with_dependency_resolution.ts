import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingInvoice } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingInvoice";
import type { IHealthcarePlatformInsuranceClaim } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaim";
import type { IHealthcarePlatformInsuranceClaimStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaimStatus";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformInsuranceClaimStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformInsuranceClaimStatus";

/**
 * Validate the insurance claim status history workflow for an organization
 * admin.
 *
 * 1. Register a new organization admin
 * 2. Login as organization admin
 * 3. Create an insurance policy with random patient and org IDs
 * 4. Create a billing invoice referencing those same IDs
 * 5. Create an insurance claim referencing the policy/invoice
 * 6. List the claim statuses for the newly created claim (expected at least 1
 *    entry)
 * 7. Attempt to list statuses for a random non-existent claim and expect failure
 * 8. Attempt to list claim status unauthenticated and expect failure
 */
export async function test_api_insurance_claim_status_update_with_dependency_resolution(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // 2. Login as organization admin
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminJoin.token ? "" : undefined,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);

  // 3. Create insurance policy (random patient/org IDs for test)
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const insurancePolicy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: {
          patient_id: patientId,
          organization_id: orgId,
          policy_number: RandomGenerator.alphaNumeric(15),
          payer_name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 15,
          }),
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
        } satisfies IHealthcarePlatformInsurancePolicy.ICreate,
      },
    );
  typia.assert(insurancePolicy);

  // 4. Create a billing invoice
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: orgId,
          patient_id: patientId,
          encounter_id: null,
          invoice_number: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "draft",
          total_amount: Math.floor(Math.random() * 5000 + 1000),
          currency: "USD",
          due_date: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(invoice);

  // 5. Create an insurance claim
  const claim =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      {
        body: {
          insurance_policy_id: insurancePolicy.id,
          invoice_id: invoice.id,
          claim_number: RandomGenerator.alphaNumeric(12),
          service_start_date: new Date().toISOString(),
          service_end_date: null,
          total_claimed_amount: invoice.total_amount,
          submission_status: "submitted",
          last_payer_response_code: null,
          last_payer_response_description: null,
        } satisfies IHealthcarePlatformInsuranceClaim.ICreate,
      },
    );
  typia.assert(claim);

  // 6. List the claim statuses for the new claim
  const statusResult =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.insuranceClaimStatuses.index(
      connection,
      {
        insuranceClaimId: claim.id,
        body: {},
      },
    );
  typia.assert(statusResult);
  TestValidator.predicate(
    "should contain at least one claim status after creation",
    statusResult.data.length > 0,
  );

  // 7. Attempt to list claim statuses for a non-existent claim (expect error)
  await TestValidator.error(
    "listing claim statuses for non-existent claimId should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.insuranceClaimStatuses.index(
        connection,
        {
          insuranceClaimId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );

  // 8. Attempt to list claim status unauthenticated (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to claim statuses should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.insuranceClaimStatuses.index(
        unauthConn,
        {
          insuranceClaimId: claim.id,
          body: {},
        },
      );
    },
  );
}
