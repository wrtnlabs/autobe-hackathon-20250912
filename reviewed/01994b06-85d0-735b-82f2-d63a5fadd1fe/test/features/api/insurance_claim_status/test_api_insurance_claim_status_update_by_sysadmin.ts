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
 * Validate System Admin status update on insurance claims and enforce workflow
 * constraints.
 *
 * 1. Organization admin joins & logs in
 * 2. Organization admin creates an insurance claim (org claims API)
 * 3. System admin joins & logs in
 * 4. System admin creates a status for the claim
 * 5. System admin updates status (PUT), changing properties
 * 6. Validate successful update: properties are changed as requested, status
 *    belongs to right claim
 * 7. Error: update with invalid claim or status ID
 * 8. Error: update when not sysadmin
 */
export async function test_api_insurance_claim_status_update_by_sysadmin(
  connection: api.IConnection,
) {
  // 1. OrgAdmin user sign up
  const orgAdminEmail = RandomGenerator.alphaNumeric(8) + "@bizorg.com";
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);

  // 2. OrgAdmin login
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Create insurance claim as OrgAdmin
  const claimCreate =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      {
        body: {
          insurance_policy_id: typia.random<string & tags.Format<"uuid">>(),
          invoice_id: typia.random<string & tags.Format<"uuid">>(),
          claim_number: RandomGenerator.alphaNumeric(10),
          service_start_date: new Date().toISOString(),
          service_end_date: null,
          total_claimed_amount: 10000 + Math.floor(Math.random() * 10000),
          submission_status: "submitted",
        } satisfies IHealthcarePlatformInsuranceClaim.ICreate,
      },
    );
  typia.assert(claimCreate);

  // 4. Switch to System Admin - sign up
  const sysadminEmail = RandomGenerator.alphaNumeric(8) + "@admincorp.com";
  const sysadminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);

  // 5. System admin login
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysadminEmail,
      provider: "local",
      provider_key: sysadminEmail,
      password: sysadminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 6. Create an insurance claim status (sysadmin)
  const statusCreate =
    await api.functional.healthcarePlatform.systemAdmin.insuranceClaims.insuranceClaimStatuses.create(
      connection,
      {
        insuranceClaimId: claimCreate.id,
        body: {
          status_code: "submitted",
          status_description: "Initial submission.",
          payment_amount: null,
          status_timestamp: new Date().toISOString(),
        } satisfies IHealthcarePlatformInsuranceClaimStatus.ICreate,
      },
    );
  typia.assert(statusCreate);
  TestValidator.equals(
    "status links to claim",
    statusCreate.claim_id,
    claimCreate.id,
  );

  // 7. System admin updates the claim status
  const newStatusCode = RandomGenerator.pick([
    "accepted",
    "denied",
    "paid",
    "needs_info",
  ] as const);
  const updateBody = {
    status_code: newStatusCode,
    status_description: RandomGenerator.paragraph({ sentences: 2 }),
    payment_amount: newStatusCode === "paid" ? 5000 : null,
    status_timestamp: new Date().toISOString(),
  } satisfies IHealthcarePlatformInsuranceClaimStatus.IUpdate;

  const statusUpdate =
    await api.functional.healthcarePlatform.systemAdmin.insuranceClaims.insuranceClaimStatuses.update(
      connection,
      {
        insuranceClaimId: claimCreate.id,
        insuranceClaimStatusId: statusCreate.id,
        body: updateBody,
      },
    );
  typia.assert(statusUpdate);
  TestValidator.equals(
    "status updated: code",
    statusUpdate.status_code,
    updateBody.status_code,
  );
  TestValidator.equals(
    "status updated: desc",
    statusUpdate.status_description,
    updateBody.status_description,
  );
  TestValidator.equals(
    "status updated: payment",
    statusUpdate.payment_amount,
    updateBody.payment_amount,
  );
  TestValidator.equals(
    "status updated: timestamp",
    statusUpdate.status_timestamp,
    updateBody.status_timestamp,
  );

  // 8. Try updating non-existent status (should error)
  await TestValidator.error("update with invalid status id", async () => {
    await api.functional.healthcarePlatform.systemAdmin.insuranceClaims.insuranceClaimStatuses.update(
      connection,
      {
        insuranceClaimId: claimCreate.id,
        insuranceClaimStatusId: typia.random<string & tags.Format<"uuid">>(),
        body: updateBody,
      },
    );
  });

  // 9. Try updating as OrgAdmin (insufficient perm, should error)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error("update as org admin not allowed", async () => {
    await api.functional.healthcarePlatform.systemAdmin.insuranceClaims.insuranceClaimStatuses.update(
      connection,
      {
        insuranceClaimId: claimCreate.id,
        insuranceClaimStatusId: statusCreate.id,
        body: updateBody,
      },
    );
  });
}
