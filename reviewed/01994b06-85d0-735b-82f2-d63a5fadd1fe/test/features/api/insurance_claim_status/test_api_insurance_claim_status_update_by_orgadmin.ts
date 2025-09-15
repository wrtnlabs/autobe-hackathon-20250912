import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceClaim } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaim";
import type { IHealthcarePlatformInsuranceClaimStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaimStatus";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test updating an existing insurance claim status by an org admin.
 *
 * Validates full business flow:
 *
 * 1. Register organization admin
 * 2. Log in as admin
 * 3. Create insurance claim
 * 4. Create initial claim status
 * 5. Update claim status and verify changes
 * 6. Error: try to update using non-existent IDs
 * 7. Error: try update with empty update payload (simulate invalid use — may not
 *    produce error)
 * 8. Error: try update as different admin (simulate insufficient privilege;
 *    depends on API logic)
 */
export async function test_api_insurance_claim_status_update_by_orgadmin(
  connection: api.IConnection,
) {
  // 1. Register org admin
  const orgAdminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminJoin },
  );
  typia.assert(orgAdmin);

  // 2. Log in as org admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: { email: orgAdmin.email, password: orgAdminJoin.password! },
  });

  // 3. Create insurance claim
  const claimData = {
    insurance_policy_id: typia.random<string & tags.Format<"uuid">>(),
    invoice_id: typia.random<string & tags.Format<"uuid">>(),
    claim_number: RandomGenerator.alphaNumeric(10),
    service_start_date: new Date().toISOString(),
    total_claimed_amount: 12345,
    submission_status: "submitted",
  } satisfies IHealthcarePlatformInsuranceClaim.ICreate;
  const claim =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      { body: claimData },
    );
  typia.assert(claim);

  // 4. Create initial claim status
  const claimStatusData = {
    status_code: "submitted",
    status_description: "Initial submission.",
    status_timestamp: new Date().toISOString(),
  } satisfies IHealthcarePlatformInsuranceClaimStatus.ICreate;
  const claimStatus =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.insuranceClaimStatuses.create(
      connection,
      {
        insuranceClaimId: claim.id,
        body: claimStatusData,
      },
    );
  typia.assert(claimStatus);

  // 5. Attempt to update claim status
  const updateBody = {
    status_code: "accepted",
    status_description: "Claim accepted by payer.",
  } satisfies IHealthcarePlatformInsuranceClaimStatus.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.insuranceClaimStatuses.update(
      connection,
      {
        insuranceClaimId: claimStatus.claim_id,
        insuranceClaimStatusId: claimStatus.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("status_code updated", updated.status_code, "accepted");
  TestValidator.equals(
    "status_description updated",
    updated.status_description,
    "Claim accepted by payer.",
  );
  TestValidator.equals(
    "claim_id unchanged",
    updated.claim_id,
    claimStatus.claim_id,
  );

  // 6. Error: non-existent claim/status IDs
  await TestValidator.error("non-existent claim status", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.insuranceClaimStatuses.update(
      connection,
      {
        insuranceClaimId: typia.random<string & tags.Format<"uuid">>(),
        insuranceClaimStatusId: typia.random<string & tags.Format<"uuid">>(),
        body: updateBody,
      },
    );
  });

  // 7. Error: syntactically (very) minimal/empty update payload
  await TestValidator.error("invalid update payload", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.insuranceClaimStatuses.update(
      connection,
      {
        insuranceClaimId: claim.id,
        insuranceClaimStatusId: claimStatus.id,
        body: {} satisfies IHealthcarePlatformInsuranceClaimStatus.IUpdate,
      },
    );
  });

  // 8. Error: attempt update with a different admin
  const otherAdminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const otherAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: otherAdminJoin },
  );
  typia.assert(otherAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: otherAdmin.email,
      password: otherAdminJoin.password!,
    },
  });
  await TestValidator.error("unauthorized status update", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.insuranceClaimStatuses.update(
      connection,
      {
        insuranceClaimId: claimStatus.claim_id,
        insuranceClaimStatusId: claimStatus.id,
        body: updateBody,
      },
    );
  });
}
