import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

export async function test_api_systemadmin_update_existing_systemadmin(
  connection: api.IConnection,
) {
  // 1. Register initial system administrator (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Update system administrator with valid data
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IEnterpriseLmsSystemAdmin.IUpdate;

  const updatedAdmin: IEnterpriseLmsSystemAdmin =
    await api.functional.enterpriseLms.systemAdmin.systemadmins.updateSystemAdmin(
      connection,
      {
        systemadminId: admin.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAdmin);

  // Validate update reflected in response
  TestValidator.equals("email updated", updatedAdmin.email, updateBody.email!);
  TestValidator.equals(
    "first_name updated",
    updatedAdmin.first_name,
    updateBody.first_name!,
  );
  TestValidator.equals(
    "last_name updated",
    updatedAdmin.last_name,
    updateBody.last_name!,
  );
  TestValidator.equals(
    "status updated",
    updatedAdmin.status,
    updateBody.status!,
  );

  // 3. Attempt update with unauthorized connection (simulate by new empty connection without token)
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.enterpriseLms.systemAdmin.systemadmins.updateSystemAdmin(
      unauthenticatedConn,
      {
        systemadminId: admin.id,
        body: updateBody,
      },
    );
  });

  // 4. Attempt to update a non-existent systemadminId
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update with non-existent systemadminId should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.systemadmins.updateSystemAdmin(
        connection,
        {
          systemadminId: nonExistentId,
          body: updateBody,
        },
      );
    },
  );

  // 5. Attempt to update with invalid email format (should fail with 400)
  const invalidEmailUpdateBody = {
    ...updateBody,
    email: "invalid-email-format",
  } satisfies IEnterpriseLmsSystemAdmin.IUpdate;

  await TestValidator.error(
    "update with invalid email should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.systemadmins.updateSystemAdmin(
        connection,
        {
          systemadminId: admin.id,
          body: invalidEmailUpdateBody,
        },
      );
    },
  );
}
