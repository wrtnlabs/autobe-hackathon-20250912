import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceClaim } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaim";
import type { IHealthcarePlatformInsuranceClaimStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaimStatus";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test successful creation of insurance claim status as organization admin.
 *
 * Steps:
 *
 * 1. Organization admin joins (with random unique email, name, password).
 * 2. Organization admin logs in with those credentials.
 * 3. Organization admin creates a valid insurance claim with all required and
 *    some optional fields.
 * 4. Organization admin creates a new insurance claim status for the above
 *    claim (providing all required status fields per DTO).
 * 5. Assert the created status references the correct claim, structure matches
 *    IHealthcarePlatformInsuranceClaimStatus, fields have expected values,
 *    and operation is allowed for the authorized admin.
 */
export async function test_api_insurance_claim_status_creation_success_orgadmin(
  connection: api.IConnection,
) {
  // 1. Organization admin onboarding
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminAuth = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: adminJoinInput },
  );
  typia.assert(adminAuth);

  // 2. Organization admin login
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const adminLoginAuth = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: adminLoginInput },
  );
  typia.assert(adminLoginAuth);

  // 3. Create insurance claim (minimal valid data, with realistic randoms)
  const insuranceClaimInput = {
    insurance_policy_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_id: typia.random<string & tags.Format<"uuid">>(),
    claim_number: RandomGenerator.alphaNumeric(10),
    service_start_date: new Date().toISOString(),
    service_end_date: null,
    total_claimed_amount: Math.round(Math.random() * 100000 + 1000),
    submission_status: RandomGenerator.pick([
      "submitted",
      "received",
      "review",
      "accepted",
      "denied",
      "paid",
    ] as const),
    last_payer_response_code: null,
    last_payer_response_description: null,
  } satisfies IHealthcarePlatformInsuranceClaim.ICreate;
  const createdClaim =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      { body: insuranceClaimInput },
    );
  typia.assert(createdClaim);

  // 4. Create insurance claim status tied to above claim
  const claimStatusInput = {
    status_code: RandomGenerator.pick([
      "submitted",
      "received",
      "denied",
      "needs_info",
      "accepted",
      "paid",
    ] as const),
    status_description: RandomGenerator.paragraph({ sentences: 2 }),
    payment_amount:
      Math.random() > 0.5
        ? Math.round(Math.random() * 90000 + 1000)
        : undefined,
    status_timestamp: new Date().toISOString(),
  } satisfies IHealthcarePlatformInsuranceClaimStatus.ICreate;
  const claimStatus =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.insuranceClaimStatuses.create(
      connection,
      { insuranceClaimId: createdClaim.id, body: claimStatusInput },
    );
  typia.assert(claimStatus);

  // 5. Assert linkage, basic property validation, type
  TestValidator.equals(
    "claim_id matches insurance claim",
    claimStatus.claim_id,
    createdClaim.id,
  );
  TestValidator.equals(
    "status_code matches input",
    claimStatus.status_code,
    claimStatusInput.status_code,
  );
  TestValidator.equals(
    "status_description matches input",
    claimStatus.status_description,
    claimStatusInput.status_description,
  );
  if (
    claimStatusInput.payment_amount !== undefined &&
    claimStatusInput.payment_amount !== null
  )
    TestValidator.equals(
      "payment_amount matches",
      claimStatus.payment_amount,
      claimStatusInput.payment_amount,
    );
  TestValidator.predicate(
    "status_timestamp matches or within 1s",
    Math.abs(
      new Date(claimStatus.status_timestamp).getTime() -
        new Date(claimStatusInput.status_timestamp).getTime(),
    ) < 1000,
  );
  TestValidator.predicate(
    "id is UUID",
    typeof claimStatus.id === "string" && claimStatus.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    typeof claimStatus.created_at === "string" &&
      claimStatus.created_at.length > 0,
  );
}
