import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import type { IHealthcarePlatformIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformIntegrationLog";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformIntegrationLog";

/**
 * Organization admin integration log isolation, filtering, pagination, and
 * authorization test.
 *
 * End-to-end, this test:
 *
 * 1. Registers as an organization admin (using a generated orgId, since org info
 *    is not returned from join)
 * 2. Performs device data ingestion creation for that org to guarantee at least
 *    one log
 * 3. As organization admin, lists integration logs POST/PATCH filtered by their
 *    org
 *
 *    - Verifies every log returned is for the test org only
 *    - Validates pagination structure
 *    - All log fields conform to documented schema
 * 4. Negative: Query logs with a truly random org ID—a different org, to confirm
 *    no data is returned
 * 5. Negative: Unauthenticated attempt to fetch logs as any user fails (forbidden)
 *
 * Org scope, isolation, proper paging/filters, authorization, and data schema
 * are validated.
 */
export async function test_api_org_admin_integration_log_search_by_organization(
  connection: api.IConnection,
) {
  // 1. Generate a random org ID for this session
  const orgId = typia.random<string & tags.Format<"uuid">>();

  // 2. Register as org admin for this orgId
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
    // Suppose 'provider' and 'provider_key' omitted for regular registration
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  // Note: The API may bind the admin to a default org, but for test determinism we use our own orgId
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinInput,
    });
  typia.assert(admin);

  // 3. Device data ingestion creation for our org; this guarantees a log record is generated for that org
  const ingestionReq = {
    healthcare_platform_organization_id: orgId,
    device_type: RandomGenerator.name(1),
    ingest_endpoint_uri:
      "https://" + RandomGenerator.alphaNumeric(10) + ".example.com/ingest",
    supported_protocol: RandomGenerator.pick([
      "HL7",
      "FHIR",
      "MQTT",
      "custom",
    ] as const),
    status: "ready",
  } satisfies IHealthcarePlatformDeviceDataIngestion.ICreate;
  const ingestion =
    await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.create(
      connection,
      { body: ingestionReq },
    );
  typia.assert(ingestion);
  // Sanity: ingestion must belong to our org
  TestValidator.equals(
    "created ingestion has correct orgId",
    ingestion.healthcare_platform_organization_id,
    orgId,
  );

  // 4. Integration log query for just our org (should get >=1 log)
  const logReq = {
    healthcare_platform_organization_id: orgId,
    page: 1,
    page_size: 10,
  } satisfies IHealthcarePlatformIntegrationLog.IRequest;
  const logs =
    await api.functional.healthcarePlatform.organizationAdmin.integrationLogs.index(
      connection,
      { body: logReq },
    );
  typia.assert(logs);

  TestValidator.predicate(
    "pagination meta present",
    logs.pagination !== undefined && logs.data !== undefined,
  );
  // Should have at least the ingestion-created log
  TestValidator.predicate("at least one log for our org", logs.data.length > 0);
  // All returned logs must be for our org
  for (const log of logs.data) {
    typia.assert<IHealthcarePlatformIntegrationLog.ISummary>(log);
    TestValidator.equals(
      "log belongs to correct orgId",
      log.healthcare_platform_organization_id,
      orgId,
    );
  }

  // 5. NEGATIVE: Query with another org ID; expect no logs
  const anotherOrgId = typia.random<string & tags.Format<"uuid">>();
  const logsOther =
    await api.functional.healthcarePlatform.organizationAdmin.integrationLogs.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: anotherOrgId,
          page: 1,
          page_size: 5,
        },
      },
    );
  typia.assert(logsOther);
  TestValidator.equals("other org log page empty", logsOther.data.length, 0);

  // 6. NEGATIVE: Unauthenticated call should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated integrationLogs access is forbidden",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.integrationLogs.index(
        unauthConn,
        { body: logReq },
      );
    },
  );
}
