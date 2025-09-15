import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceClaim } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaim";
import type { IHealthcarePlatformInsuranceClaimStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaimStatus";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test successful creation of a new insurance claim status by a system admin.
 *
 * 1. Register and login as an organization admin.
 * 2. Organization admin creates a new insurance claim.
 * 3. Register and login as a system admin.
 * 4. System admin adds a status to the created claim.
 * 5. Validate that result references the claim, system admin context is correct,
 *    and all fields are present.
 *
 * This validates business permission rules and status creation workflow for
 * system admin.
 */
export async function test_api_insurance_claim_status_creation_success_sysadmin(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminJoinBody = {
    email: orgAdminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    provider: "local",
    provider_key: orgAdminEmail,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  await api.functional.auth.organizationAdmin.join(connection, {
    body: orgAdminJoinBody,
  });

  // 2. Login as organization admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminJoinBody.password,
      provider: orgAdminJoinBody.provider,
      provider_key: orgAdminJoinBody.provider_key,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Organization admin creates an insurance claim
  const claimCreateBody = {
    insurance_policy_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_id: typia.random<string & tags.Format<"uuid">>(),
    claim_number: RandomGenerator.alphaNumeric(12),
    service_start_date: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 10,
    ).toISOString(),
    service_end_date: new Date().toISOString(),
    total_claimed_amount: 10000,
    submission_status: "submitted",
  } satisfies IHealthcarePlatformInsuranceClaim.ICreate;
  const claim: IHealthcarePlatformInsuranceClaim =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      {
        body: claimCreateBody,
      },
    );
  typia.assert(claim);

  // 4. Register & login as system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoinBody = {
    email: sysAdminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    provider: "local",
    provider_key: sysAdminEmail,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoinBody,
  });
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminJoinBody.password,
      provider: sysAdminJoinBody.provider,
      provider_key: sysAdminJoinBody.provider_key,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 5. System admin adds insurance claim status
  const statusCreateBody = {
    status_code: RandomGenerator.pick([
      "accepted",
      "denied",
      "needs_info",
      "submitted",
      "paid",
    ] as const),
    status_description: RandomGenerator.paragraph({ sentences: 3 }),
    payment_amount: 3500,
    status_timestamp: new Date().toISOString(),
  } satisfies IHealthcarePlatformInsuranceClaimStatus.ICreate;
  const status =
    await api.functional.healthcarePlatform.systemAdmin.insuranceClaims.insuranceClaimStatuses.create(
      connection,
      {
        insuranceClaimId: claim.id,
        body: statusCreateBody,
      },
    );
  typia.assert(status);
  // Validate references and fields
  TestValidator.equals("claim id matches", status.claim_id, claim.id);
  TestValidator.equals(
    "status code matches",
    status.status_code,
    statusCreateBody.status_code,
  );
  TestValidator.equals(
    "status description matches",
    status.status_description,
    statusCreateBody.status_description,
  );
  TestValidator.equals(
    "payment amount matches",
    status.payment_amount,
    statusCreateBody.payment_amount,
  );
  TestValidator.predicate(
    "has status id",
    typeof status.id === "string" && status.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof status.created_at === "string" &&
      !isNaN(Date.parse(status.created_at)),
  );
  TestValidator.predicate(
    "status_timestamp is ISO string",
    typeof status.status_timestamp === "string" &&
      !isNaN(Date.parse(status.status_timestamp)),
  );
}
