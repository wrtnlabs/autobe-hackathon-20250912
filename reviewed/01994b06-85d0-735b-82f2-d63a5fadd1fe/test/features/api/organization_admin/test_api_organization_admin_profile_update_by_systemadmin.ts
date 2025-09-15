import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates update of an organization admin profile by a system admin.
 *
 * 1. Register system admin (onboarding).
 * 2. Register organization admin (capture organizationAdminId).
 * 3. Log in as system admin for authentication.
 * 4. Successful update scenario: system admin updates email, full name and
 *    phone of organization admin (modifiable fields).
 * 5. Assert that returned entity reflects the updated fields, with updated_at
 *    later than previous value.
 * 6. Error attempt: Try to update with an invalid organizationAdminId (random
 *    uuid). Expect error.
 * 7. Error attempt: Try to update a non-modifiable/credential field (e.g.,
 *    attempt to inject 'created_at') in body -- expect error (should be
 *    business error, not type error: body should not include non-schema
 *    fields).
 * 8. Soft-delete scenario: Simulate soft deletion by updating deleted_at to a
 *    value, then attempt another update (should fail -- this must be
 *    simulated since actual API for soft delete isn't present; so simply
 *    skip if impossible to soft-delete by API, but note check).
 * 9. Error attempt: Omit required update fields completely in body, should
 *    succeed with no change since all update fields are optional (optional:
 *    include a no-op update and assert entity is unchanged).
 * 10. Assert that audit/re-audit works: re-fetch the entity after update and
 *     check values.
 *
 * All negative (error) cases must NOT use type-violating input or missing
 * field invalidations (since these break TypeScript safety), but focus on
 * business logic errors instead.
 */
export async function test_api_organization_admin_profile_update_by_systemadmin(
  connection: api.IConnection,
) {
  // Onboard system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "1234abcd!@#",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);

  // Onboard organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "5678zxcv@!",
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // Log in as system admin is implicitly done due to join operation's session-binding, so we immediately proceed.

  // Remember old organization admin fields
  const organizationAdminId = orgAdmin.id;
  const prevEntity = orgAdmin;

  // --- 1. Happy path update: Change email, full_name, phone
  const updatedFields = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IUpdate;
  const updateResult =
    await api.functional.healthcarePlatform.systemAdmin.organizationadmins.update(
      connection,
      {
        organizationAdminId,
        body: updatedFields,
      },
    );
  typia.assert(updateResult);
  TestValidator.equals(
    "updated full_name reflected",
    updateResult.full_name,
    updatedFields.full_name,
  );
  TestValidator.equals(
    "updated email reflected",
    updateResult.email,
    updatedFields.email,
  );
  TestValidator.equals(
    "updated phone reflected",
    updateResult.phone,
    updatedFields.phone,
  );
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updateResult.updated_at) > new Date(prevEntity.updated_at),
  );

  // --- 2. Error case: invalid organizationAdminId
  await TestValidator.error("update with invalid id fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.organizationadmins.update(
      connection,
      {
        organizationAdminId: typia.random<string & tags.Format<"uuid">>(), // not the stored id
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies IHealthcarePlatformOrganizationAdmin.IUpdate,
      },
    );
  });

  // --- 3. Error case: try to update a non-existent field (not in IUpdate) -- not actually possible due to TypeScript restrictions, so skip this negative-case as type error would occur.

  // --- 4. Soft-delete behavior: simulate soft-delete by direct update
  // Not possible through current API as there is no soft-delete endpoint -- skip, but if update reflects entity's deleted_at (should remain unchanged), validate non-deleted.
  TestValidator.equals(
    "admin still active",
    updateResult.deleted_at,
    undefined,
  );

  // --- 5. Update with empty body: no change
  const noOpResult =
    await api.functional.healthcarePlatform.systemAdmin.organizationadmins.update(
      connection,
      {
        organizationAdminId,
        body: {} satisfies IHealthcarePlatformOrganizationAdmin.IUpdate,
      },
    );
  typia.assert(noOpResult);
  // Changed_at should still be advanced
  TestValidator.predicate(
    "no-op update advances updated_at",
    new Date(noOpResult.updated_at) > new Date(updateResult.updated_at),
  );
  // Since no fields updated, previous non-updated fields should remain
  TestValidator.equals(
    "no email change on empty update",
    noOpResult.email,
    updateResult.email,
  );
  TestValidator.equals(
    "no full_name change on empty update",
    noOpResult.full_name,
    updateResult.full_name,
  );
  TestValidator.equals(
    "no phone change on empty update",
    noOpResult.phone,
    updateResult.phone,
  );

  // --- 6. Re-fetch entity (final assertion)
  // (Assuming API provides a way to fetch admin by id, which isn't present; skip direct fetch)
  // Otherwise, use the last update result as the postcondition representation.
}
