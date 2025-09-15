import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test detail retrieval of healthcare platform system admin by id (valid,
 * invalid, insufficient privilege).
 *
 * 1. Register a new system admin with provider 'local' and login context
 * 2. Create a secondary system admin then lookup detail by id
 * 3. Validate response fields - no credential hashes, only profile info
 * 4. Attempt to lookup non-existent admin id (random UUID)
 * 5. Attempt to lookup with malformed UUID (expect error)
 * 6. Attempt lookup as unauthenticated connection (expect error)
 */
export async function test_api_systemadmin_detail_valid_and_invalid_id(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin 'A'
  const adminA_email = typia.random<string & tags.Format<"email">>();
  const adminA_password = RandomGenerator.alphaNumeric(12);
  const adminA = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminA_email,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminA_email,
      password: adminA_password,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminA);

  // 2. Create a second admin 'B' as admin 'A'
  const adminB_email = typia.random<string & tags.Format<"email">>();
  const adminB_create =
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.create(
      connection,
      {
        body: {
          email: adminB_email,
          full_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
        } satisfies IHealthcarePlatformSystemAdmin.ICreate,
      },
    );
  typia.assert(adminB_create);

  // 3. Lookup admin 'B' by id, expect profile fields only
  const adminB_detail =
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.at(
      connection,
      {
        systemAdminId: adminB_create.id,
      },
    );
  typia.assert(adminB_detail);
  TestValidator.equals(
    "profile id matches",
    adminB_detail.id,
    adminB_create.id,
  );
  TestValidator.equals(
    "profile email matches",
    adminB_detail.email,
    adminB_create.email,
  );
  TestValidator.equals(
    "profile full_name matches",
    adminB_detail.full_name,
    adminB_create.full_name,
  );
  TestValidator.equals(
    "no sensitive hashes",
    (adminB_detail as any).password_hash,
    undefined,
  );

  // 4. Lookup non-existent adminId (should error)
  await TestValidator.error("non-existent systemAdminId fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.at(
      connection,
      {
        systemAdminId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 5. Malformed UUID (should error)
  await TestValidator.error("malformed UUID fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.at(
      connection,
      {
        systemAdminId: "not-a-uuid" as any,
      },
    );
  });

  // 6. Try as unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.systemadmins.at(
      unauthConn,
      {
        systemAdminId: adminB_create.id,
      },
    );
  });
}
