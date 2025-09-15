import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDataExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDataExportLog";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate organization admin can retrieve a specific data export log and see
 * all required metadata fields. This test simulates admin registration, login,
 * and then (using random data) a data export log lookup. Note: since no data
 * export log creation/setup API exists, dataExportLog is simulated using
 * typia.random. The test validates existence of all fields, correct API
 * behavior for the happy path, and attempts error case with a non-existent
 * dataExportLog ID.
 *
 * 1. Register new organization admin
 * 2. Login as this organization admin
 * 3. Simulate a data export log id (since no creation route is available)
 * 4. Retrieve the log using the GET API and check object structure
 * 5. Error case: invalid/nonexistent id should be denied
 */
export async function test_api_data_export_log_retrieval_as_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register new organization admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;

  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as organization admin
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;

  const loggedIn = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedIn);
  TestValidator.equals(
    "joined and logged-in admin IDs match",
    admin.id,
    loggedIn.id,
  );

  // 3. Simulate a data export log object (as no setup/create endpoint exists in API, we use typia.random)
  const simulatedLog = typia.random<IHealthcarePlatformDataExportLog>();

  // 4. Retrieve the data export log by ID
  const result =
    await api.functional.healthcarePlatform.organizationAdmin.dataExportLogs.at(
      connection,
      {
        dataExportLogId: simulatedLog.id,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "dataExportLog id matches requested id",
    result.id,
    simulatedLog.id,
  );

  // 5. Edge case: invalid/nonexistent ID retrieval should fail (business logic error, not type error)
  await TestValidator.error(
    "should deny retrieval with non-existent ID",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.dataExportLogs.at(
        connection,
        {
          dataExportLogId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
