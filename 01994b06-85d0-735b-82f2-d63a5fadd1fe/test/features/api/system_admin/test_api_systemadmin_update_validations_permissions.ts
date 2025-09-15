import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate update logic, permissions, validation, and field constraints for
 * system administrator update endpoint.
 *
 * Test scenarios:
 *
 * 1. Register as system admin (admin1) and login to get authorized context.
 * 2. Create a second admin account (admin2) to use as target for updates.
 * 3. Update allowed fields for admin2 (full_name, phone) with valid data, expect
 *    success and correct response structure (no credential fields).
 * 4. Attempt to update forbidden fields ("password", "provider") - should have no
 *    effect and not be present in response.
 * 5. Attempt to update with invalid email (malformed), expect error.
 * 6. Attempt to blank out full_name, expect error.
 * 7. Attempt to update email to first admin's email (should fail uniqueness test).
 * 8. Attempt to update non-existent admin (random UUID), expect error.
 * 9. Soft-delete admin2, then attempt update (should be denied).
 * 10. Attempt to update admin2 after logging out as admin1 and using
 *     unauthenticated context (should be denied).
 *
 * All attempts should verify no sensitive authentication/credential data is
 * leaked.
 *
 * On valid update, confirm timestamps change, and all expected fields are
 * correct. On errors, ensure proper error conditions.
 */
export async function test_api_systemadmin_update_validations_permissions(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin (admin1)
  const joinBodyAdmin1 = {
    email: `admin1_${RandomGenerator.alphaNumeric(10)}@corp.com` as string &
      tags.Format<"email">,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key:
      `admin1_${RandomGenerator.alphaNumeric(12)}@corp.com` as string,
    password: RandomGenerator.alphaNumeric(14),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin1 = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBodyAdmin1,
  });
  typia.assert(admin1);
  TestValidator.predicate(
    "admin1 contains no password-hash fields",
    !("password" in admin1),
  );

  // 2. Create a second system admin (admin2) as admin1
  const createBodyAdmin2 = {
    email: `admin2_${RandomGenerator.alphaNumeric(10)}@corp.com` as string &
      tags.Format<"email">,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.ICreate;
  const admin2 =
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.create(
      connection,
      { body: createBodyAdmin2 },
    );
  typia.assert(admin2);
  TestValidator.predicate(
    "admin2 contains no password-hash fields",
    !("password" in admin2),
  );

  // 3. Update full_name, phone for admin2 (happy-path)
  const updateBody = {
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.update(
      connection,
      {
        systemAdminId: admin2.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("admin2 id matches after update", updated.id, admin2.id);
  TestValidator.equals(
    "admin2 email remains the same",
    updated.email,
    admin2.email,
  );
  TestValidator.equals(
    "admin2 full_name matches updated",
    updated.full_name,
    updateBody.full_name,
  );
  TestValidator.equals(
    "admin2 phone matches updated",
    updated.phone,
    updateBody.phone,
  );
  TestValidator.predicate(
    "no password or credentials in update response",
    !("password" in updated),
  );
  TestValidator.equals("not soft deleted", updated.deleted_at, null);
  TestValidator.notEquals(
    "updated_at should change on update",
    updated.updated_at,
    admin2.updated_at,
  );

  // 4. Forbidden field update attempt - password/provider should be ignored
  const updateForbidden = {
    full_name: RandomGenerator.name(),
    password: "forbidden-password123", // not allowed
    provider: "malicious-provider", // not allowed
  } as any;
  const forbiddenResult =
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.update(
      connection,
      {
        systemAdminId: admin2.id,
        body: updateForbidden,
      },
    );
  typia.assert(forbiddenResult);
  TestValidator.predicate(
    "forbidden credential fields are NOT present in response",
    !("password" in forbiddenResult) && !("provider" in forbiddenResult),
  );

  // 5. Invalid field (malformed email)
  await TestValidator.error("invalid email format should error", async () => {
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.update(
      connection,
      {
        systemAdminId: admin2.id,
        body: {
          email: "not_an_email" as any,
        },
      },
    );
  });

  // 6. Blank out full_name
  await TestValidator.error("blank full_name should error", async () => {
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.update(
      connection,
      {
        systemAdminId: admin2.id,
        body: {
          full_name: "",
        },
      },
    );
  });

  // 7. Update to duplicate email (admin1's email)
  await TestValidator.error("duplicate email update should error", async () => {
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.update(
      connection,
      {
        systemAdminId: admin2.id,
        body: {
          email: admin1.email as string & tags.Format<"email">,
        },
      },
    );
  });

  // 8. Update non-existent admin
  await TestValidator.error(
    "update non-existent admin should error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.systemadmins.update(
        connection,
        {
          systemAdminId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            full_name: RandomGenerator.name(),
          },
        },
      );
    },
  );

  // 9. Soft-delete admin2 and try update again
  const deleteTime = new Date().toISOString();
  const softDeleted =
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.update(
      connection,
      {
        systemAdminId: admin2.id,
        body: {
          deleted_at: deleteTime as string & tags.Format<"date-time">,
        },
      },
    );
  typia.assert(softDeleted);
  TestValidator.equals(
    "deleted_at is set after soft delete",
    softDeleted.deleted_at,
    deleteTime as string & tags.Format<"date-time">,
  );
  await TestValidator.error(
    "update after soft deletion should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.systemadmins.update(
        connection,
        {
          systemAdminId: admin2.id,
          body: {
            full_name: "Should not update",
          },
        },
      );
    },
  );

  // 10. Attempt update while unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated update attempt should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.systemadmins.update(
        unauthConn,
        {
          systemAdminId: admin2.id,
          body: {
            full_name: "no auth context",
          },
        },
      );
    },
  );
}
