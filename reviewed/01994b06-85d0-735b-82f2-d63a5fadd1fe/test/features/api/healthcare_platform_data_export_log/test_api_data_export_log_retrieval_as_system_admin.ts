import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDataExportLog";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E test for system admin to retrieve a healthcare platform data export
 * log.
 *
 * 1. Register a system admin (using real join step with required properties)
 * 2. Login as the system admin with those credentials
 * 3. Attempt to retrieve data export log with a valid (random) UUID
 * 4. Validate all returned fields by typia.assert()
 * 5. Verify request with non-existent/invalid ID returns error
 * 6. Verify access is denied for unauthenticated connection
 */
export async function test_api_data_export_log_retrieval_as_system_admin(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuthorized = await api.functional.auth.systemAdmin.join(
    connection,
    { body: adminJoin },
  );
  typia.assert(adminAuthorized);

  // 2. Login as system admin with the same credentials
  const adminLoginBody = {
    email: adminEmail,
    provider: "local",
    provider_key: adminEmail,
    password: adminJoin.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminLogin);

  // 3. Attempt GET with random valid log id (happy-path: will succeed only in mock/test/mocked env)
  const dataExportLogId = typia.random<string & tags.Format<"uuid">>();
  const outputLog =
    await api.functional.healthcarePlatform.systemAdmin.dataExportLogs.at(
      connection,
      { dataExportLogId },
    );
  typia.assert(outputLog);

  // 4. Verify request is forbidden for unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated system admin cannot get export log",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.dataExportLogs.at(
        unauthConn,
        { dataExportLogId },
      );
    },
  );

  // 5. Expect error for clearly non-existent ID (using new random valid UUID)
  const neverExistId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "system admin gets error for non-existent log id",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.dataExportLogs.at(
        connection,
        { dataExportLogId: neverExistId },
      );
    },
  );
}
