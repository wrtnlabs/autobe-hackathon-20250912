import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDeviceDataIngestion";

/**
 * Validate advanced search, filtering, and pagination of device data
 * ingestion configurations as a system admin.
 *
 * This test covers the business workflow for searching device data
 * ingestion integrations using various filter and pagination options,
 * ensuring correct results, proper filtering, and accurate pagination
 * metadata.
 *
 * Steps:
 *
 * 1. Register and authenticate a system admin user (join operation, ensure
 *    email and password, receive token and userId).
 * 2. Create a healthcare organization (unique code/name/status, receive
 *    organization id).
 * 3. Create multiple device data ingestions (all referencing that org id),
 *    using varied device types (e.g., vital_monitor, ecg, custom_sensor),
 *    statuses (e.g., ready, pending, error), and protocols (e.g., HL7,
 *    FHIR, MQTT, custom).
 * 4. For each created entry, vary at least device_type, supported_protocol,
 *    and status. Keep some properties common across a subset and vary
 *    others for testing filtering edge cases.
 * 5. Perform PATCH /healthcarePlatform/systemAdmin/deviceDataIngestions with
 *    search filters: a. By exact device_type b. By partial device_type
 *    string c. By supported_protocol d. By org id e. By status f. With
 *    pagination: set page_size and page, check correct subset g. With sort
 *    ordering (if supported) h. Edge cases: empty result filter (impossible
 *    term), maximum page_size, out-of-range page
 * 6. For each response:
 *
 *    - Validate all results match the filter criteria
 *    - Validate no out-of-scope records included
 *    - Validate correct pagination structure (current page, limit, records,
 *         pages), and relation to sample data
 *    - For empty filter or non-matching criteria, result list is empty and
 *         pagination meta makes sense
 */
export async function test_api_systemadmin_device_data_ingestion_advanced_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: "Test123!admin",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create organization
  const orgCode = RandomGenerator.alphaNumeric(8);
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: orgCode,
          name: RandomGenerator.name(),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org);
  const orgId = org.id;

  // 3. Create device data ingestions (varied for rich search test)
  const deviceTypes = ["vital_monitor", "ecg", "custom_sensor"] as const;
  const protocols = ["HL7", "FHIR", "MQTT", "custom"] as const;
  const statuses = ["ready", "pending", "error"] as const;

  const baseCount = deviceTypes.length * protocols.length * statuses.length;
  const ingestions: IHealthcarePlatformDeviceDataIngestion[] = [];
  for (const device_type of deviceTypes) {
    for (const supported_protocol of protocols) {
      for (const status of statuses) {
        const output =
          await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.create(
            connection,
            {
              body: {
                healthcare_platform_organization_id: orgId,
                device_type,
                ingest_endpoint_uri: `tcp://${RandomGenerator.alphaNumeric(5)}.iot.net:3000/${device_type}`,
                supported_protocol,
                status,
              } satisfies IHealthcarePlatformDeviceDataIngestion.ICreate,
            },
          );
        typia.assert(output);
        ingestions.push(output);
      }
    }
  }

  // 4. PATCH: Filter by exact device_type
  let result =
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgId,
          device_type: "ecg",
        } satisfies IHealthcarePlatformDeviceDataIngestion.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.predicate(
    "all records are ECG",
    result.data.every((x) => x.device_type === "ecg"),
  );

  // 5. PATCH: Filter by protocol
  result =
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgId,
          supported_protocol: "MQTT",
        } satisfies IHealthcarePlatformDeviceDataIngestion.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.predicate(
    "all records have protocol MQTT",
    result.data.every((x) => x.supported_protocol === "MQTT"),
  );

  // 6. PATCH: Filter by status
  result =
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgId,
          status: "pending",
        } satisfies IHealthcarePlatformDeviceDataIngestion.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.predicate(
    "all records have status pending",
    result.data.every((x) => x.status === "pending"),
  );

  // 7. PATCH: Pagination (page=2, page_size=5)
  result =
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgId,
          page: 2 as number,
          page_size: 5 as number,
        } satisfies IHealthcarePlatformDeviceDataIngestion.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals("pagination limit", result.pagination.limit, 5);
  TestValidator.equals("pagination current", result.pagination.current, 2);
  // Should not exceed page_size in data length
  TestValidator.predicate(
    "page does not exceed limit",
    result.data.length <= 5,
  );

  // 8. PATCH: Edge case - non-matching filter (impossible device)
  result =
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgId,
          device_type: "nonexistent_type_9999",
        } satisfies IHealthcarePlatformDeviceDataIngestion.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "empty result for non-matching search",
    result.data.length,
    0,
  );

  // 9. PATCH: Edge case - max page size (use total count)
  result =
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgId,
          page: 1 as number,
          page_size: baseCount as number,
        } satisfies IHealthcarePlatformDeviceDataIngestion.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals("max page size", result.pagination.limit, baseCount);
  TestValidator.equals(
    "all ingestions in single big page",
    result.data.length,
    baseCount,
  );

  // 10. PATCH: Edge case - out-of-range page (should return empty/valid meta)
  result =
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgId,
          page: 9999 as number,
          page_size: 3 as number,
        } satisfies IHealthcarePlatformDeviceDataIngestion.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.equals("empty for out-of-range page", result.data.length, 0);
  TestValidator.equals(
    "pagination current is correct",
    result.pagination.current,
    9999,
  );

  // 11. PATCH: Empty filter returns all (default page size)
  result =
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgId,
        } satisfies IHealthcarePlatformDeviceDataIngestion.IRequest,
      },
    );
  typia.assert(result);
  TestValidator.predicate(
    "returns at least 1 record with empty filter",
    result.data.length > 0,
  );
  // Validate all belong to current org
  TestValidator.predicate(
    "all results belong to correct org",
    result.data.every((x) => x.healthcare_platform_organization_id === orgId),
  );
}
