import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPermission";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test the update of a permission record by system admin: (1) successful update
 * of allowed fields (name, description, status); (2) attempt to update
 * forbidden or immutable fields (such as code or scope_type) and ensure server
 * returns validation error; (3) update attempt for a non-existent permissionId
 * yields correct error response; (4) only authorized users (sysadmin) can
 * update—attempt update with invalid/unauthorized context.
 *
 * Steps:
 *
 * 1. Register and authenticate as system admin.
 * 2. Create a permission for update target.
 * 3. Successfully update allowed mutable fields.
 * 4. Attempt to update forbidden fields like code and scope_type – expect error.
 * 5. Attempt to update non-existent permissionId – expect error.
 * 6. Attempt to update as unauthorized user – expect error.
 */
export async function test_api_permission_update_success_and_validation(
  connection: api.IConnection,
) {
  // Step 1: Join as system admin and get authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: adminEmail,
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create a permission as update target
  const permissionCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
    scope_type: "platform",
    status: "active",
  } satisfies IHealthcarePlatformPermission.ICreate;
  const permission: IHealthcarePlatformPermission =
    await api.functional.healthcarePlatform.systemAdmin.permissions.create(
      connection,
      {
        body: permissionCreate,
      },
    );
  typia.assert(permission);

  // Step 3: Update allowed fields (name, description, status)
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "retired",
  } satisfies IHealthcarePlatformPermission.IUpdate;
  const updatedPermission =
    await api.functional.healthcarePlatform.systemAdmin.permissions.update(
      connection,
      {
        permissionId: permission.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPermission);
  TestValidator.equals(
    "updated permission name",
    updatedPermission.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated permission description",
    updatedPermission.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated permission status",
    updatedPermission.status,
    updateBody.status,
  );
  TestValidator.equals(
    "permission code remains unchanged",
    updatedPermission.code,
    permission.code,
  );
  TestValidator.equals(
    "permission scope_type remains unchanged",
    updatedPermission.scope_type,
    permission.scope_type,
  );

  // Step 4: Attempt to update forbidden/immutable fields (code, scope_type): expect error
  await TestValidator.error(
    "cannot update code or scope_type (immutable fields)",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.permissions.update(
        connection,
        {
          permissionId: permission.id,
          body: {
            code: RandomGenerator.alphaNumeric(8),
            scope_type: "organization",
          } satisfies IHealthcarePlatformPermission.IUpdate,
        },
      );
    },
  );

  // Step 5: Attempt to update non-existent permissionId
  await TestValidator.error(
    "update of non-existent permissionId fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.permissions.update(
        connection,
        {
          permissionId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            name: RandomGenerator.name(),
          } satisfies IHealthcarePlatformPermission.IUpdate,
        },
      );
    },
  );

  // Step 6: Attempt update as unauthorized user (simulate by clearing auth header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot update permission",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.permissions.update(
        unauthConn,
        {
          permissionId: permission.id,
          body: {
            name: RandomGenerator.name(),
          } satisfies IHealthcarePlatformPermission.IUpdate,
        },
      );
    },
  );
}
