import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLegalHold";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Test scenario: Organization admin updates an existing legal hold record.
 *
 * 1. Register and login an organization admin user (obtain credentials)
 * 2. Create a legal hold for this organization (simulate deps:
 *    org/subject/department as UUIDs)
 * 3. Update the legal hold: modify status, reason, and release_at
 * 4. Validate update: check new status, reason, and release_at are reflected as
 *    expected
 *
 * Note: Direct audit log verification is not possible (no audit log API), so
 * the test confirms update by data correctness.
 */
export async function test_api_legal_hold_update_by_org_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "TestPassword123!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Login as that admin (simulate real session/token)
  const loginResult = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "TestPassword123!",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loginResult);

  // 3. Create a new legal hold in this organization (simulate department_id and subject_id as UUIDs)
  const departmentId = typia.random<string & tags.Format<"uuid">>();
  const subjectId = typia.random<string & tags.Format<"uuid">>();

  const createHoldBody = {
    organization_id: admin.id,
    imposed_by_id: admin.id,
    department_id: departmentId,
    subject_type: "patient_data",
    subject_id: subjectId,
    reason: "Initial investigation/hold",
    method: "manual",
    status: "active",
    effective_at: new Date().toISOString(),
    release_at: null,
  } satisfies IHealthcarePlatformLegalHold.ICreate;

  const createHoldResult =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.create(
      connection,
      {
        body: createHoldBody,
      },
    );
  typia.assert(createHoldResult);

  // 4. Update legal hold: change status, update reason, set release date
  const updatedReason = "Hold reviewed and released";
  const updatedStatus = "released";
  const updatedReleaseAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 week later

  const updateHoldBody = {
    status: updatedStatus,
    reason: updatedReason,
    release_at: updatedReleaseAt,
  } satisfies IHealthcarePlatformLegalHold.IUpdate;

  const updatedHold =
    await api.functional.healthcarePlatform.organizationAdmin.legalHolds.update(
      connection,
      {
        legalHoldId: createHoldResult.id,
        body: updateHoldBody,
      },
    );
  typia.assert(updatedHold);

  // 5. Validate that updated fields reflect new values
  TestValidator.equals(
    "legal hold status updated",
    updatedHold.status,
    updatedStatus,
  );
  TestValidator.equals(
    "legal hold reason updated",
    updatedHold.reason,
    updatedReason,
  );
  TestValidator.equals(
    "legal hold release_at updated",
    updatedHold.release_at,
    updatedReleaseAt,
  );

  // Confirm unchanged fields remain the same
  TestValidator.equals(
    "organization_id unchanged",
    updatedHold.organization_id,
    createHoldResult.organization_id,
  );
  TestValidator.equals(
    "department_id unchanged",
    updatedHold.department_id,
    createHoldResult.department_id,
  );
  TestValidator.equals(
    "subject_type unchanged",
    updatedHold.subject_type,
    createHoldResult.subject_type,
  );
  TestValidator.equals(
    "subject_id unchanged",
    updatedHold.subject_id,
    createHoldResult.subject_id,
  );
}
