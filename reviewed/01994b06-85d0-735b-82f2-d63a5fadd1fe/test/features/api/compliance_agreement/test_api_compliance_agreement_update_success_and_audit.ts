import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceAgreement } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceAgreement";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate the update of a system admin compliance agreement's status.
 *
 * This test asserts that after registering a system admin and creating a
 * compliance agreement, the status/fields can be updated. The business flow
 * also ensures that proper authentication is required for update. The test
 * checks output correctness (fields updated, timestamps change) and negative
 * path for non-existent ID produces error.
 *
 * 1. Register system admin (join)
 * 2. Create compliance agreement (create)
 * 3. Update the compliance agreement (update) with new status/fields
 * 4. Confirm success: updated values, timestamp changes
 * 5. Attempt update with invalid ID and expect failure
 */
export async function test_api_compliance_agreement_update_success_and_audit(
  connection: api.IConnection,
) {
  // (1) System admin registration/authentication
  const sysAdminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoin,
  });
  typia.assert(sysAdminAuth);

  // (2) Create compliance agreement
  const agreementCreate = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    policy_version_id: typia.random<string & tags.Format<"uuid">>(),
    agreement_type: RandomGenerator.paragraph({ sentences: 2 }),
    status: "pending",
    signer_id: typia.random<string & tags.Format<"uuid">>(),
    signed_at: undefined,
    method: undefined,
    expires_at: undefined,
  } satisfies IHealthcarePlatformComplianceAgreement.ICreate;
  const agreement =
    await api.functional.healthcarePlatform.systemAdmin.complianceAgreements.create(
      connection,
      { body: agreementCreate },
    );
  typia.assert(agreement);

  // (3) Modify agreement: update status, method, and signed_at
  const updatedStatus = "signed";
  const updateBody = {
    status: updatedStatus,
    signed_at: new Date().toISOString(),
    method: "digital-signature",
    expires_at: undefined,
  } satisfies IHealthcarePlatformComplianceAgreement.IUpdate;

  const updated =
    await api.functional.healthcarePlatform.systemAdmin.complianceAgreements.update(
      connection,
      {
        complianceAgreementId: agreement.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // (4) Validate update: fields and timestamp changed as expected
  TestValidator.equals("status updated", updated.status, updatedStatus);
  TestValidator.equals("method updated", updated.method, "digital-signature");
  TestValidator.predicate(
    "updated_at is later than created_at after update",
    new Date(updated.updated_at).getTime() >
      new Date(agreement.updated_at).getTime(),
  );

  // (5) Negative case: update non-existent agreement
  await TestValidator.error(
    "updating non-existent agreement must fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceAgreements.update(
        connection,
        {
          complianceAgreementId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
