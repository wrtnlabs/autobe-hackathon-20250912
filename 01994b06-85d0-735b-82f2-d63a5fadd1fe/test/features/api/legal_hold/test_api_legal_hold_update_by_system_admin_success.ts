import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * System admin can update a legal hold (status, effective, release, or scope).
 *
 * 1. Register system admin
 * 2. Login as system admin
 * 3. Create an initial legal hold
 * 4. Update the legal hold (e.g., status: 'released', update effective_at,
 *    release_at, method, reason, department)
 * 5. Validate the changes are reflected in the updated entity (status,
 *    updated_at).
 * 6. Reload the legal hold, check changes persisted.
 * 7. Permissions: only system admin can update; no type error or business logic
 *    error tested here.
 * 8. Audit: updated_at timestamp must update; previous status is not equal to new
 *    status.
 */
export async function test_api_legal_hold_update_by_system_admin_success(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as system admin
  const loginRes = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: joinBody.email,
      provider: joinBody.provider,
      provider_key: joinBody.provider_key,
      password: joinBody.password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginRes);

  // Prepare UUIDs for legal hold creation
  const organization_id = typia.random<string & tags.Format<"uuid">>();
  const subject_id = typia.random<string & tags.Format<"uuid">>();
  const department_id = typia.random<string & tags.Format<"uuid">>();

  // 3. Create a legal hold
  const legalHoldCreateBody = {
    organization_id,
    subject_type: "patient_data",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    method: "manual",
    status: "active",
    effective_at: new Date().toISOString(),
    imposed_by_id: admin.id,
    department_id,
    subject_id,
    release_at: null,
  } satisfies IHealthcarePlatformLegalHold.ICreate;
  const legalHold =
    await api.functional.healthcarePlatform.systemAdmin.legalHolds.create(
      connection,
      {
        body: legalHoldCreateBody,
      },
    );
  typia.assert(legalHold);

  // 4. Update the legal hold (release and change fields)
  const updateBody = {
    status: "released",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    method: "legal_request",
    effective_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // 1 day before
    release_at: new Date().toISOString(),
    department_id: null,
    imposed_by_id: admin.id,
    subject_type: "patient_data",
    subject_id,
  } satisfies IHealthcarePlatformLegalHold.IUpdate;
  const updatedLegalHold =
    await api.functional.healthcarePlatform.systemAdmin.legalHolds.update(
      connection,
      {
        legalHoldId: legalHold.id,
        body: updateBody,
      },
    );
  typia.assert(updatedLegalHold);
  TestValidator.equals(
    "legal hold status is updated to released",
    updatedLegalHold.status,
    "released",
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedLegalHold.updated_at,
    legalHold.updated_at,
  );
  TestValidator.notEquals(
    "previous and updated status differ",
    legalHold.status,
    updatedLegalHold.status,
  );
  TestValidator.equals(
    "legal hold id is unchanged",
    updatedLegalHold.id,
    legalHold.id,
  );

  // 5. (Re-read) Check update is persisted (simulate getting the legal hold again)
  // We can't call a GET by ID endpoint as none is in the materials, so check by using the update result.
  // 6. Additional audit: updated_at is updated
  TestValidator.predicate(
    "updated_at is after created_at",
    Date.parse(updatedLegalHold.updated_at) >=
      Date.parse(updatedLegalHold.created_at),
  );
}
