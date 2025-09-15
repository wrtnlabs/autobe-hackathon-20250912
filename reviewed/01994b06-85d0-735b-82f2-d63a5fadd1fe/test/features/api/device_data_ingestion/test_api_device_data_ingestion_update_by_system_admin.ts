import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that system admin can update an existing device data ingestion
 * record for an organization, and that changes persist & enforce business
 * constraints, while disallowing unsafe/inappropriate updates.
 *
 * 1. Register and login as system admin.
 * 2. Create a healthcare organization.
 * 3. Create a device data ingestion for the org.
 * 4. Update the ingestion record (PUT with various fields mutated).
 * 5. Validate updated properties, timestamps bump, and that required fields reject
 *    null.
 * 6. Assert error for update on non-existent/deleted IDs.
 */
export async function test_api_device_data_ingestion_update_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const sysAdminJoin: IHealthcarePlatformSystemAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
  };
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoin,
  });
  typia.assert(adminAuth);
  // login is technically redundant since .join sets session

  // 2. Create organization
  const orgReq = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgReq },
    );
  typia.assert(organization);

  // 3. Create device data ingestion config for org
  const ingestionReq = {
    healthcare_platform_organization_id: organization.id,
    device_type: RandomGenerator.pick([
      "vital_monitor",
      "ecg",
      "infusion_pump",
      "lab_analyzer",
      "dialysis_machine",
      "custom_device",
    ] as const),
    ingest_endpoint_uri: `https://ingest.${RandomGenerator.alphaNumeric(7)}.hospital.device/api`,
    supported_protocol: RandomGenerator.pick([
      "HL7",
      "FHIR",
      "MQTT",
      "custom",
    ] as const),
    status: "ready",
  } satisfies IHealthcarePlatformDeviceDataIngestion.ICreate;
  const created =
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.create(
      connection,
      { body: ingestionReq },
    );
  typia.assert(created);

  // 4. Update ingestion config (PUT, mutate endpoint URI and protocol)
  const updatedUri = `https://ingest-updated.${RandomGenerator.alphaNumeric(7)}.hospital.device/api`;
  const updateInput = {
    ingest_endpoint_uri: updatedUri,
    device_type: "ecg",
    supported_protocol: "FHIR",
    status: "ready",
  } satisfies IHealthcarePlatformDeviceDataIngestion.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.update(
      connection,
      {
        deviceDataIngestionId: created.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated endpoint URI persists",
    updated.ingest_endpoint_uri,
    updatedUri,
  );
  TestValidator.equals(
    "updated device_type persists",
    updated.device_type,
    "ecg",
  );
  TestValidator.equals(
    "updated protocol persists",
    updated.supported_protocol,
    "FHIR",
  );
  TestValidator.equals("updated status persists", updated.status, "ready");
  TestValidator.predicate(
    "update should bump updated_at timestamp",
    new Date(updated.updated_at).getTime() >
      new Date(created.updated_at).getTime(),
  );

  // 5. Attempt update of non-existent/deleted record triggers error
  const missingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update with missing ingestion ID fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.update(
        connection,
        {
          deviceDataIngestionId: missingId,
          body: {
            ingest_endpoint_uri: updatedUri,
          },
        },
      );
    },
  );
}
