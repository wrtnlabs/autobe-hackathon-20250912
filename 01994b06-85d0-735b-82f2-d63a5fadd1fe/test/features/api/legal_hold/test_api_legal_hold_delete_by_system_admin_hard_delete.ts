import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that a system admin can permanently delete a legal hold record
 * (hard delete), ensuring that the legal hold is not locked or under
 * dependency so deletion is possible. Steps:
 *
 * 1. Register a system admin account (IHealthcarePlatformSystemAdmin.IJoin)
 * 2. Login as the system admin (IHealthcarePlatformSystemAdmin.ILogin)
 * 3. Create a legal hold record using
 *    healthcarePlatform.systemAdmin.legalHolds.create
 * 4. Delete it using healthcarePlatform.systemAdmin.legalHolds.erase
 * 5. Ensure no error is thrown, operation completes (void/204 success)
 * 6. Attempt double-deletion; verify error occurs
 */
export async function test_api_legal_hold_delete_by_system_admin_hard_delete(
  connection: api.IConnection,
) {
  // 1. Register the system admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as system admin
  const loginBody = {
    email: joinBody.email,
    provider: "local",
    provider_key: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminAuth = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(adminAuth);

  // 3. Create a legal hold
  const now = new Date();
  const legalHoldBody = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    imposed_by_id: admin.id,
    department_id: null,
    subject_type: RandomGenerator.pick([
      "patient_data",
      "org_data",
      "audit_trail",
      "external_document",
    ] as const),
    subject_id: null,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    method: RandomGenerator.pick([
      "manual",
      "system",
      "legal request",
      "policy",
    ] as const),
    status: "active",
    effective_at: now.toISOString(),
    release_at: null,
  } satisfies IHealthcarePlatformLegalHold.ICreate;
  const legalHold =
    await api.functional.healthcarePlatform.systemAdmin.legalHolds.create(
      connection,
      { body: legalHoldBody },
    );
  typia.assert(legalHold);

  // 4. DELETE the legal hold
  await api.functional.healthcarePlatform.systemAdmin.legalHolds.erase(
    connection,
    { legalHoldId: legalHold.id },
  );

  // 5. Try to delete again (should error)
  await TestValidator.error(
    "should not delete non-existent (already deleted) legal hold",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.legalHolds.erase(
        connection,
        { legalHoldId: legalHold.id },
      );
    },
  );
}
