import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * E2E test for organization admin hard-deleting a legal hold.
 *
 * Steps performed:
 *
 * 1. Register and onboard a new organization admin
 * 2. Log in as organization admin to establish session
 * 3. Create a legal hold using required DTO fields
 * 4. Delete the legal hold (by id)
 * 5. Attempt to delete again (expect error, already deleted)
 * 6. Attempt to delete a random, non-existent UUID (expect error)
 *
 * Skipped permission and audit log checks due to lack of corresponding
 * endpoints.
 */
export async function test_api_legal_hold_delete_by_org_admin_hard_delete(
  connection: api.IConnection,
) {
  // 1. Register organization admin (join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Login as org admin (for token refresh robustness)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin.email,
      password: adminJoinBody.password,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Create a legal hold as that admin
  const legalHoldCreate = {
    organization_id: admin.id, // Use admin.id for organization boundary
    subject_type: RandomGenerator.pick([
      "patient_data",
      "org_data",
      "audit_trail",
    ] as const),
    reason: RandomGenerator.paragraph(),
    method: "manual",
    status: "active",
    effective_at: new Date().toISOString(),
  } satisfies IHealthcarePlatformLegalHold.ICreate;
  const legalHold =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.create(
      connection,
      { body: legalHoldCreate },
    );
  typia.assert(legalHold);
  TestValidator.equals("status is active", legalHold.status, "active");

  // 4. Delete the legal hold (erase)
  await api.functional.healthcarePlatform.organizationAdmin.legalHolds.erase(
    connection,
    { legalHoldId: legalHold.id },
  );

  // 5. Try to delete again (should fail with error)
  await TestValidator.error(
    "second deletion of same legal hold should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.legalHolds.erase(
        connection,
        { legalHoldId: legalHold.id },
      );
    },
  );

  // 6. Try to delete a non-existent, random UUID (should fail)
  await TestValidator.error(
    "deleting non-existent legal hold UUID should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.legalHolds.erase(
        connection,
        {
          legalHoldId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
