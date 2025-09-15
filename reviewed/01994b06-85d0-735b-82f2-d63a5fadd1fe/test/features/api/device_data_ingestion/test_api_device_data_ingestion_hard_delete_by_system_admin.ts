import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * End-to-end scenario for a system administrator performing a hard delete on a
 * medical device data ingestion integration.
 *
 * 1. Join as a system administrator to establish superuser context.
 * 2. Create a device data ingestion configuration to obtain deviceDataIngestionId.
 * 3. Delete the integration using system admin account, validate deletion.
 * 4. Confirm post-deletion unavailability by attempting to delete again (should
 *    fail).
 * 5. Try to delete a non-existent/random deviceDataIngestionId (should error).
 * 6. Try to delete as a non-admin (should error for permissions).
 * 7. Confirm that deleted integration cannot be found/used again.
 */
export async function test_api_device_data_ingestion_hard_delete_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Join as system admin
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@company.com`,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: `${RandomGenerator.alphaNumeric(8)}@company.com`,
      password: RandomGenerator.alphaNumeric(10),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create device data ingestion integration
  const ingestion =
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          device_type: RandomGenerator.name(1),
          ingest_endpoint_uri: `https://${RandomGenerator.alphaNumeric(10)}.device/ingest`,
          supported_protocol: RandomGenerator.pick([
            "HL7",
            "FHIR",
            "custom",
          ] as const),
          status: "ready",
        } satisfies IHealthcarePlatformDeviceDataIngestion.ICreate,
      },
    );
  typia.assert(ingestion);

  // 3. Hard delete as system admin
  await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.erase(
    connection,
    {
      deviceDataIngestionId: ingestion.id,
    },
  );

  // 4. Confirm post-deletion unavailability by attempting to delete again (should fail)
  await TestValidator.error(
    "should not allow access to deleted ingestion",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.erase(
        connection,
        {
          deviceDataIngestionId: ingestion.id,
        },
      );
    },
  );

  // 5. Try delete with random invalid ID
  await TestValidator.error(
    "should fail on nonexistent deviceDataIngestionId",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.erase(
        connection,
        {
          deviceDataIngestionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Attempt DELETE as non-admin (simulate by clearing token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should fail without admin authorization",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.erase(
        unauthConn,
        {
          deviceDataIngestionId: ingestion.id,
        },
      );
    },
  );
}
