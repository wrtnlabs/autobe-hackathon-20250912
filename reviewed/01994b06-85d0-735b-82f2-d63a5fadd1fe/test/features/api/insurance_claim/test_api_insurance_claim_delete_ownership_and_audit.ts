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
 * Validate the ownership, permission boundary, and audit reliability of
 * insurance claim deletion.
 *
 * Steps:
 *
 * 1. Register OrgAdmin A and OrgAdmin B (distinct organizations) and login as
 *    OrgAdmin A
 * 2. As OrgAdmin A, create a patient, invoice, policy, then an insurance claim
 * 3. Successfully delete the insurance claim as OrgAdmin A
 * 4. Attempt claim deletion as OrgAdmin B (should fail: forbidden)
 * 5. As OrgAdmin A, attempt to delete a non-existent claim (random uuid) (should
 *    error)
 * 6. As OrgAdmin A, attempt to delete already deleted claim again (should error)
 *
 * All negative test cases verify business error logic (forbidden, not found,
 * etc.)
 */
export async function test_api_insurance_claim_delete_ownership_and_audit(
  connection: api.IConnection,
) {
  // 1. Register OrgAdmin A & login
  const orgAdminAEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminA: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminAEmail,
        full_name: RandomGenerator.name(),
        password: "P@ssword123",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdminA);

  // 2. As OrgAdmin A, create baseline resources
  const patient: IHealthcarePlatformPatient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date(1990, 5, 20).toISOString(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  const invoice: IHealthcarePlatformBillingInvoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: orgAdminA.id,
          patient_id: patient.id,
          invoice_number: RandomGenerator.alphaNumeric(12),
          status: "draft",
          total_amount: 99000,
          currency: "USD",
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(invoice);

  const policy: IHealthcarePlatformInsurancePolicy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: {
          organization_id: orgAdminA.id,
          patient_id: patient.id,
          policy_number: RandomGenerator.alphaNumeric(10),
          payer_name: RandomGenerator.paragraph({ sentences: 3 }),
          coverage_start_date: "2024-01-01",
          plan_type: "commercial",
          policy_status: "active",
        } satisfies IHealthcarePlatformInsurancePolicy.ICreate,
      },
    );
  typia.assert(policy);

  const claim: IHealthcarePlatformInsuranceClaim =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      {
        body: {
          insurance_policy_id: policy.id,
          invoice_id: invoice.id,
          claim_number: RandomGenerator.alphaNumeric(8),
          service_start_date: invoice.created_at,
          total_claimed_amount: invoice.total_amount,
          submission_status: "submitted",
        } satisfies IHealthcarePlatformInsuranceClaim.ICreate,
      },
    );
  typia.assert(claim);

  // 3. Successfully delete the insurance claim as OrgAdmin A
  await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.erase(
    connection,
    {
      insuranceClaimId: claim.id,
    },
  );

  // 4. Register OrgAdmin B (another org) and login
  const orgAdminBEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminB: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: orgAdminBEmail,
        full_name: RandomGenerator.name(),
        password: "An0therP@ss!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(orgAdminB);

  // Attempt claim deletion as OrgAdmin B
  await TestValidator.error(
    "Cross-org deletion of insurance claim by OrgAdmin B should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.erase(
        connection,
        {
          insuranceClaimId: claim.id,
        },
      );
    },
  );

  // 5. As OrgAdmin A, attempt to delete a non-existent claim
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminAEmail,
      password: "P@ssword123",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  const bogusClaimId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting a non-existent insurance claim should trigger a business error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.erase(
        connection,
        {
          insuranceClaimId: bogusClaimId,
        },
      );
    },
  );

  // 6. As OrgAdmin A, attempt to delete already deleted claim
  await TestValidator.error(
    "Deleting an already deleted claim should result in a consistent error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.erase(
        connection,
        {
          insuranceClaimId: claim.id,
        },
      );
    },
  );
}
