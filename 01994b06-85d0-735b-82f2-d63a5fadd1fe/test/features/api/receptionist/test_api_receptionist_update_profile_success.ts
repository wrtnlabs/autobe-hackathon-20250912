import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Validate updating a receptionist's profile as an organization admin.
 *
 * 1. Register as organization admin using random valid credentials
 * 2. Create a receptionist (random email, full name, phone)
 * 3. Update the receptionist's full name and phone using PUT endpoint
 * 4. Validate that returned object reflects the new values for updated fields and
 *    keeps other fields unchanged
 * 5. Ensure updated_at is newer and deleted_at stays unchanged/null
 * 6. Confirm that trying to update unmodifiable field (like email) is not allowed
 *    at DTO level (so not tested)
 */
export async function test_api_receptionist_update_profile_success(
  connection: api.IConnection,
) {
  // 1. Register as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a receptionist
  const recepCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const originalReceptionist: IHealthcarePlatformReceptionist =
    await api.functional.healthcarePlatform.organizationAdmin.receptionists.create(
      connection,
      { body: recepCreateBody },
    );
  typia.assert(originalReceptionist);

  // 3. Update receptionist: change full_name and phone
  const newFullName = RandomGenerator.name();
  const newPhone = RandomGenerator.mobile();
  const updateBody = {
    full_name: newFullName,
    phone: newPhone,
  } satisfies IHealthcarePlatformReceptionist.IUpdate;
  const updated: IHealthcarePlatformReceptionist =
    await api.functional.healthcarePlatform.organizationAdmin.receptionists.update(
      connection,
      {
        receptionistId: originalReceptionist.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Validate updated fields
  TestValidator.equals(
    "id should not change",
    updated.id,
    originalReceptionist.id,
  );
  TestValidator.equals(
    "email should remain the same",
    updated.email,
    originalReceptionist.email,
  );
  TestValidator.equals(
    "full_name should be updated",
    updated.full_name,
    newFullName,
  );
  TestValidator.equals("phone should be updated", updated.phone, newPhone);
  TestValidator.equals(
    "created_at should remain unchanged",
    updated.created_at,
    originalReceptionist.created_at,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(updated.updated_at) > new Date(originalReceptionist.updated_at),
  );
  TestValidator.equals(
    "deleted_at should stay null or undefined",
    updated.deleted_at,
    originalReceptionist.deleted_at ?? null,
  );

  // 5. Attempt to update to the same data (should succeed and updated_at should change)
  const updatedAgain: IHealthcarePlatformReceptionist =
    await api.functional.healthcarePlatform.organizationAdmin.receptionists.update(
      connection,
      {
        receptionistId: originalReceptionist.id,
        body: { full_name: newFullName, phone: newPhone },
      },
    );
  typia.assert(updatedAgain);
  TestValidator.equals(
    "id should not change on idempotent update",
    updatedAgain.id,
    originalReceptionist.id,
  );
  TestValidator.equals(
    "email should still be the same",
    updatedAgain.email,
    originalReceptionist.email,
  );
  TestValidator.equals(
    "full_name should remain updated",
    updatedAgain.full_name,
    newFullName,
  );
  TestValidator.equals(
    "phone should remain updated",
    updatedAgain.phone,
    newPhone,
  );
  TestValidator.equals(
    "created_at should still be unchanged",
    updatedAgain.created_at,
    originalReceptionist.created_at,
  );
}
