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
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

export async function test_api_insurance_claim_status_deletion_system_admin_complete(
  connection: api.IConnection,
) {
  /**
   * E2E test: deletion of insurance claim status by system admin with full
   * real-world dependencies
   *
   * 1. Register system admin
   * 2. Register organization admin
   * 3. Log in as organization admin (for data creation)
   * 4. Create billing invoice (needs org/patient IDs)
   * 5. Create insurance policy tied to invoice organization and patient
   * 6. Submit insurance claim with invoice and policy references
   * 7. Add insurance claim status to claim
   * 8. Log back in as system admin for privileged deletion
   * 9. Delete the insurance claim status by system admin privilege
   * 10. Attempt second deletion (should fail) and verify a business error is
   *     detected
   */
  // 1. Register system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
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

  // 2. Register organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // 3. Login as org admin (context for resource creation)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. Create billing invoice
  const billingInvoiceBody =
    typia.random<IHealthcarePlatformBillingInvoice.ICreate>();
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      { body: billingInvoiceBody },
    );
  typia.assert(invoice);

  // 5. Create insurance policy (linked to org and patient from invoice)
  const insurancePolicyBody = {
    organization_id: invoice.organization_id,
    patient_id: invoice.patient_id,
    policy_number: RandomGenerator.alphaNumeric(8),
    payer_name: RandomGenerator.name(2),
    group_number: RandomGenerator.alphaNumeric(6),
    coverage_start_date: new Date().toISOString().substring(0, 10),
    plan_type: RandomGenerator.pick([
      "commercial",
      "medicare",
      "medicaid",
      "self-pay",
      "worker_comp",
      "auto",
    ] as const),
    policy_status: "active",
  } satisfies IHealthcarePlatformInsurancePolicy.ICreate;
  const policy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      { body: insurancePolicyBody },
    );
  typia.assert(policy);

  // 6. Create insurance claim (policy + invoice)
  const claimBody = {
    insurance_policy_id: policy.id,
    invoice_id: invoice.id,
    claim_number: RandomGenerator.alphaNumeric(12),
    service_start_date: invoice.created_at,
    total_claimed_amount: invoice.total_amount,
    submission_status: "submitted",
  } satisfies IHealthcarePlatformInsuranceClaim.ICreate;
  const claim =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      { body: claimBody },
    );
  typia.assert(claim);

  // 7. Add insurance claim status
  const statusBody = {
    status_code: "submitted",
    status_description: "Initial submission for review.",
    status_timestamp: claim.created_at,
  } satisfies IHealthcarePlatformInsuranceClaimStatus.ICreate;
  const status =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.insuranceClaimStatuses.create(
      connection,
      {
        insuranceClaimId: claim.id,
        body: statusBody,
      },
    );
  typia.assert(status);

  // 8. Log back in as system admin for delete privilege
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 9. Delete claim status (first attempt, should succeed)
  await api.functional.healthcarePlatform.systemAdmin.insuranceClaims.insuranceClaimStatuses.erase(
    connection,
    { insuranceClaimId: claim.id, insuranceClaimStatusId: status.id },
  );

  // 10. Attempt to delete status a second time (should fail, audit business error)
  await TestValidator.error(
    "second deletion attempt should fail with business error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.insuranceClaims.insuranceClaimStatuses.erase(
        connection,
        { insuranceClaimId: claim.id, insuranceClaimStatusId: status.id },
      );
    },
  );
}
