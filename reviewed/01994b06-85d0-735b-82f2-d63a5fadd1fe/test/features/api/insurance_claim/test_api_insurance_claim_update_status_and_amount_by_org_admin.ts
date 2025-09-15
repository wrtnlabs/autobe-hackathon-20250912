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
 * Validates that organization admins can update their own insurance claims and
 * are forbidden from updating others. Also ensures invalid status transitions
 * and updates to nonexistent claims are handled correctly.
 *
 * Workflow:
 *
 * 1. Register/login as org admin A.
 * 2. Create patient, invoice, policy in A's org context.
 * 3. Create a valid insurance claim.
 * 4. Update claim status, amount, description as admin A. Confirm update works.
 * 5. Register/login as admin B.
 * 6. Attempt to update claim as admin B (different org). Confirm forbidden.
 * 7. Attempt to update non-existent insuranceClaimId. Confirm 404 error.
 * 8. As admin A, attempt invalid status transition (e.g., paid after denied).
 *    Confirm business logic error.
 */
export async function test_api_insurance_claim_update_status_and_amount_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as org admin A
  const emailA = typia.random<string & tags.Format<"email">>();
  const passwordA = RandomGenerator.alphaNumeric(10);
  const adminA = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: emailA,
      full_name: RandomGenerator.name(),
      password: passwordA,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(adminA);
  // re-login explicitly for full flow
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: emailA,
      password: passwordA,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. Create patient, invoice, policy
  const patient =
    await api.functional.healthcarePlatform.organizationAdmin.patients.create(
      connection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          full_name: RandomGenerator.name(),
          date_of_birth: new Date("1980-01-01T00:00:00Z").toISOString(),
        } satisfies IHealthcarePlatformPatient.ICreate,
      },
    );
  typia.assert(patient);

  const invoice =
    await api.functional.healthcarePlatform.organizationAdmin.billingInvoices.create(
      connection,
      {
        body: {
          organization_id: adminA.id,
          patient_id: patient.id,
          invoice_number: RandomGenerator.alphaNumeric(12),
          status: "draft",
          total_amount: 1234,
          currency: "USD",
        } satisfies IHealthcarePlatformBillingInvoice.ICreate,
      },
    );
  typia.assert(invoice);

  const policy =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: {
          organization_id: adminA.id,
          patient_id: patient.id,
          policy_number: RandomGenerator.alphaNumeric(8),
          payer_name: RandomGenerator.name(),
          coverage_start_date: "2020-01-01",
          plan_type: "commercial",
          policy_status: "active",
        } satisfies IHealthcarePlatformInsurancePolicy.ICreate,
      },
    );
  typia.assert(policy);

  // 3. Create a valid insurance claim
  const claim =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      {
        body: {
          insurance_policy_id: policy.id,
          invoice_id: invoice.id,
          claim_number: RandomGenerator.alphaNumeric(10),
          service_start_date: new Date("2022-08-03T10:20:00Z").toISOString(),
          total_claimed_amount: 900,
          submission_status: "submitted",
        } satisfies IHealthcarePlatformInsuranceClaim.ICreate,
      },
    );
  typia.assert(claim);

  // 4. Update claim status, amount, description as admin A. Confirm update works.
  const updateBody = {
    total_claimed_amount: 700,
    submission_status: "denied",
    last_payer_response_description: "Service not covered",
  } satisfies IHealthcarePlatformInsuranceClaim.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.update(
      connection,
      {
        insuranceClaimId: claim.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated claim amount and status by adminA work",
    updated.total_claimed_amount,
    700,
  );
  TestValidator.equals(
    "updated claim status by adminA",
    updated.submission_status,
    "denied",
  );
  TestValidator.equals(
    "updated payer response description",
    updated.last_payer_response_description,
    "Service not covered",
  );

  // 5. Register/login as admin B
  const emailB = typia.random<string & tags.Format<"email">>();
  const passwordB = RandomGenerator.alphaNumeric(10);
  const adminB = await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: emailB,
      full_name: RandomGenerator.name(),
      password: passwordB,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  typia.assert(adminB);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: emailB,
      password: passwordB,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  // 6. Attempt to update claim as admin B (different org). Confirm forbidden.
  await TestValidator.error(
    "admin B forbidden from updating admin A claim",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.update(
        connection,
        {
          insuranceClaimId: claim.id,
          body: {
            total_claimed_amount: 501,
          } satisfies IHealthcarePlatformInsuranceClaim.IUpdate,
        },
      );
    },
  );

  // 7. Try to update non-existent insuranceClaimId. Confirm 404 error.
  await TestValidator.error(
    "updating nonexistent claim returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.update(
        connection,
        {
          insuranceClaimId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            total_claimed_amount: 90,
          } satisfies IHealthcarePlatformInsuranceClaim.IUpdate,
        },
      );
    },
  );

  // 8. As admin A, attempt invalid status transition (e.g., paid after denied). Confirm business logic error.
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: emailA,
      password: passwordA,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "invalid status flow (paid after denied) forbidden",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.update(
        connection,
        {
          insuranceClaimId: claim.id,
          body: {
            submission_status: "paid",
          } satisfies IHealthcarePlatformInsuranceClaim.IUpdate,
        },
      );
    },
  );
}
