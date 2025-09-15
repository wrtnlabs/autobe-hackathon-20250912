import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Validate that an organization admin can successfully delete a receptionist
 * account.
 *
 * Steps:
 *
 * 1. Organization admin registers (join).
 * 2. Admin creates a new receptionist account.
 * 3. Admin deletes the created receptionist using their UUID.
 * 4. Attempt to delete the same receptionist again (should error, as the
 *    receptionist is already deleted).
 * 5. Attempt to delete a random non-existent receptionist UUID (should error).
 */
export async function test_api_receptionist_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register Organization Admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "admin signup returned valid UUID",
    typeof admin.id === "string" && admin.id.length > 0,
  );

  // 2. Create a receptionist
  const receptionistBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformReceptionist.ICreate;
  const receptionist: IHealthcarePlatformReceptionist =
    await api.functional.healthcarePlatform.organizationAdmin.receptionists.create(
      connection,
      {
        body: receptionistBody,
      },
    );
  typia.assert(receptionist);
  TestValidator.predicate(
    "receptionist signup returned valid UUID",
    typeof receptionist.id === "string" && receptionist.id.length > 0,
  );

  // 3. Delete receptionist
  await api.functional.healthcarePlatform.organizationAdmin.receptionists.erase(
    connection,
    {
      receptionistId: receptionist.id,
    },
  );

  // 4. Attempt to delete the same receptionist again (should error)
  await TestValidator.error(
    "should not delete already-deleted receptionist",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.receptionists.erase(
        connection,
        {
          receptionistId: receptionist.id,
        },
      );
    },
  );

  // 5. Attempt to delete a non-existent receptionist UUID (should error)
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should error on deleting non-existent receptionist",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.receptionists.erase(
        connection,
        {
          receptionistId: randomUuid,
        },
      );
    },
  );
}
