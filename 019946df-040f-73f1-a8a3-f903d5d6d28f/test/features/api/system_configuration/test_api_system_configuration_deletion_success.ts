import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemConfiguration";

/**
 * Test deletion of a system configuration including authorized creation,
 * deletion, and validation of deletion behavior.
 *
 * This end-to-end test verifies that a system administrator can create a
 * system configuration, delete it successfully, and that subsequent
 * attempts to delete the same configuration fail. It also validates that
 * unauthorized deletion attempts are rejected.
 *
 * Steps:
 *
 * 1. Register a system administrator user with valid details, authentifying
 *    access.
 * 2. Create a new system configuration with a unique key and descriptive
 *    value.
 * 3. Delete the created configuration by its ID.
 * 4. Confirm deletion by expecting failure on repeated delete of same ID.
 * 5. Attempt deletion using unauthorized connection and expect an error.
 *
 * The test asserts type correctness of all API responses using
 * typia.assert. Business rules including authentication and authorization
 * are confirmed.
 */
export async function test_api_system_configuration_deletion_success(
  connection: api.IConnection,
) {
  // 1. Authenticate as systemAdmin by joining
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create system configuration
  const configBody = {
    key: `test_key_${RandomGenerator.alphaNumeric(8)}`,
    value: `test_value_${RandomGenerator.alphaNumeric(10)}`,
    description: `Test description ${RandomGenerator.paragraph({ sentences: 3 })}`,
  } satisfies IEnterpriseLmsSystemConfiguration.ICreate;

  const createdConfig: IEnterpriseLmsSystemConfiguration =
    await api.functional.enterpriseLms.systemAdmin.systemConfigurations.create(
      connection,
      { body: configBody },
    );
  typia.assert(createdConfig);

  // 3. Delete the created configuration
  await api.functional.enterpriseLms.systemAdmin.systemConfigurations.erase(
    connection,
    { id: createdConfig.id },
  );

  // 4. Confirm deletion by attempting delete again (should error)
  await TestValidator.error(
    "deleting already deleted configuration should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.systemConfigurations.erase(
        connection,
        { id: createdConfig.id },
      );
    },
  );

  // 5. Test unauthorized deletion attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.systemConfigurations.erase(
        unauthConn,
        { id: createdConfig.id },
      );
    },
  );
}
