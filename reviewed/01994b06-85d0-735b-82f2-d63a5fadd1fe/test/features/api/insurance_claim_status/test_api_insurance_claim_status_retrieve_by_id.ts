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

/**
 * E2E flow for insurance claim status retrieval:
 *
 * 1. Organization admin is registered and logged in
 * 2. Create insurance policy for a (random) patient under their org
 * 3. Create billing invoice for same patient/org
 * 4. Create insurance claim referencing the policy and invoice
 * 5. Add a new insurance claim status to that claim
 * 6. Fetch insurance claim status detail by ID and validate
 * 7. Negative: try fetching with bogus status ID (expect error)
 */
export async function test_api_insurance_claim_status_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const joinRes = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminFullName,
      phone: adminPhone,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(joinRes);

  // Log in (token will be set in connection.headers)
  const loginRes = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginRes);

  // 2. Create insurance policy for a random patient under the same org
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const orgId = typia.assert<string & tags.Format<"uuid">>(joinRes.id!);
  const policy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: {
          patient_id: patientId,
          organization_id: orgId,
          policy_number: RandomGenerator.alphaNumeric(10),
          payer_name: RandomGenerator.name(2),
          coverage_start_date: new Date().toISOString().slice(0, 10),
          plan_type: "commercial",
          policy_status: "active",
        } satisfies IHealthcarePlatformInsurancePolicy.ICreate,
      },
    );
  typia.assert(policy);

  // 3. Create billing invoice for patient/org
  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: orgId,
          patient_id: patientId,
          invoice_number: RandomGenerator.alphaNumeric(8),
          status: "draft",
          total_amount: 1000,
          currency: "USD",
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(invoice);

  // 4. Create insurance claim linked to policy/invoice
  const claim =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      {
        body: {
          insurance_policy_id: policy.id,
          invoice_id: invoice.id,
          claim_number: RandomGenerator.alphaNumeric(12),
          service_start_date: new Date().toISOString(),
          total_claimed_amount: invoice.total_amount,
          submission_status: "submitted",
        } satisfies IHealthcarePlatformInsuranceClaim.ICreate,
      },
    );
  typia.assert(claim);

  // 5. Create insurance claim status
  const statusBody = {
    status_code: "submitted",
    status_description: RandomGenerator.paragraph({ sentences: 4 }),
    payment_amount: 0,
    status_timestamp: new Date().toISOString(),
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

  // 6. Retrieve insurance claim status by parent claim/status id
  const gotStatus =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.insuranceClaimStatuses.at(
      connection,
      {
        insuranceClaimId: claim.id,
        insuranceClaimStatusId: status.id,
      },
    );
  typia.assert(gotStatus);
  // Validate correct fetch
  TestValidator.equals(
    "retrieved claim status equals created status",
    gotStatus,
    status,
  );

  // 7. Negative test: fetching with non-existent status ID returns error
  await TestValidator.error(
    "fetching nonexistent insurance claim status should error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.insuranceClaimStatuses.at(
        connection,
        {
          insuranceClaimId: claim.id,
          insuranceClaimStatusId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
