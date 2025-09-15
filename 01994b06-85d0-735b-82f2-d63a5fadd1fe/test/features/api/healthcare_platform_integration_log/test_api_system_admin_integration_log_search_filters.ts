import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import type { IHealthcarePlatformIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformIntegrationLog";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformIntegrationLog";

/**
 * E2E test for integration log search and filtering
 *
 * This test covers the system admin workflow for retrieving integration
 * logs and applying advanced filters for audit/compliance. It verifies
 * filtering by organization, event status, integration type, result
 * pagination/structure, and strict access control.
 *
 * 1. Register and login as a system admin (email/full_name/provider/password)
 * 2. Create a device data ingestion record—guaranteeing at least one
 *    integration log linkage
 * 3. Search integration logs with organization filter and verify all returned
 *    logs have matching org ID
 * 4. Use event_status/integration_type filters for stricter results
 * 5. Test pagination by varying 'page' and 'page_size' and confirm
 *    structure/limits
 * 6. Edge: search with a random (nonexistent) orgId—expect empty result
 * 7. Edge: omit orgId filter—API may error (if required) or just return more
 *    data
 * 8. Edge: perform call as unauthenticated user—expect access denied error
 */
export async function test_api_system_admin_integration_log_search_filters(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as system admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const fullName = RandomGenerator.name();
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email,
      full_name: fullName,
      provider: "local",
      provider_key: email,
      password,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);

  // 2. Register a device data ingestion (orgId must match for log filtering)
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const dataIngest =
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgId,
          device_type: RandomGenerator.pick([
            "vital_monitor",
            "ecg",
            "lab_machine",
            "infusion_pump",
          ] as const),
          ingest_endpoint_uri: `https://device.ingest/${RandomGenerator.alphaNumeric(8)}`,
          supported_protocol: RandomGenerator.pick([
            "HL7",
            "FHIR",
            "custom",
          ] as const),
          status: "ready",
        } satisfies IHealthcarePlatformDeviceDataIngestion.ICreate,
      },
    );
  typia.assert(dataIngest);

  // 3. Search integration logs by org
  const reqByOrg = {
    healthcare_platform_organization_id: orgId,
  } satisfies IHealthcarePlatformIntegrationLog.IRequest;
  const resultByOrg =
    await api.functional.healthcarePlatform.systemAdmin.integrationLogs.index(
      connection,
      {
        body: reqByOrg,
      },
    );
  typia.assert(resultByOrg);
  TestValidator.predicate(
    "all logs match orgId",
    resultByOrg.data.every(
      (log) => log.healthcare_platform_organization_id === orgId,
    ),
  );

  // 4. Stricter filter (choose status/type known from previous data if present)
  if (resultByOrg.data.length > 0) {
    const sampleLog = resultByOrg.data[0];
    const stricterFilter = {
      healthcare_platform_organization_id: orgId,
      event_status: sampleLog.event_status,
      integration_type: sampleLog.integration_type,
    } satisfies IHealthcarePlatformIntegrationLog.IRequest;
    const stricterRes =
      await api.functional.healthcarePlatform.systemAdmin.integrationLogs.index(
        connection,
        { body: stricterFilter },
      );
    typia.assert(stricterRes);
    TestValidator.predicate(
      "all logs match orgId & status/type",
      stricterRes.data.every(
        (log) =>
          log.healthcare_platform_organization_id === orgId &&
          log.event_status === sampleLog.event_status &&
          log.integration_type === sampleLog.integration_type,
      ),
    );
  }

  // 5. Pagination test (page 1, page_size 1)
  const reqPage1 = {
    healthcare_platform_organization_id: orgId,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<500>,
  } satisfies IHealthcarePlatformIntegrationLog.IRequest;
  const resPage1 =
    await api.functional.healthcarePlatform.systemAdmin.integrationLogs.index(
      connection,
      { body: reqPage1 },
    );
  typia.assert(resPage1);
  TestValidator.equals(
    "page 1 limit 1 returns max 1 record",
    resPage1.data.length <= 1,
    true,
  );
  if (resPage1.data.length === 1) {
    // Request page 2 - should not duplicate page 1 result
    const reqPage2 = {
      ...reqPage1,
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    };
    const resPage2 =
      await api.functional.healthcarePlatform.systemAdmin.integrationLogs.index(
        connection,
        { body: reqPage2 },
      );
    typia.assert(resPage2);
    TestValidator.notEquals(
      "page 2 delivers different records or empty",
      resPage2.data[0],
      resPage1.data[0],
    );
  }

  // 6. Search with unknown org ID (should yield empty)
  const unknownOrgReq = {
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies IHealthcarePlatformIntegrationLog.IRequest;
  const unknownOrgRes =
    await api.functional.healthcarePlatform.systemAdmin.integrationLogs.index(
      connection,
      { body: unknownOrgReq },
    );
  typia.assert(unknownOrgRes);
  TestValidator.equals(
    "unknown org yields empty log results",
    unknownOrgRes.data.length,
    0,
  );

  // 7. Omit all filters (see if API errors or delivers results)
  await TestValidator.error(
    "missing all filters errors or returns data",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.integrationLogs.index(
        connection,
        {
          body: {} satisfies IHealthcarePlatformIntegrationLog.IRequest,
        },
      );
    },
  );

  // 8. Attempt call as unauthenticated (no auth)—should fail
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated user access denied", async () => {
    await api.functional.healthcarePlatform.systemAdmin.integrationLogs.index(
      unauthConn,
      {
        body: reqByOrg,
      },
    );
  });
}
