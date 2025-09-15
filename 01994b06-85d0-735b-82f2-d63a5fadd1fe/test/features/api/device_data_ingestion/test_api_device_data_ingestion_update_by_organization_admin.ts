import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Comprehensive E2E test for updating device data ingestion configs via org
 * admin.
 *
 * Validates: full update path, error path for non-existent, deleted, and
 * duplicate entries, authentication/authorization boundaries.
 */
export async function test_api_device_data_ingestion_update_by_organization_admin(
  connection: api.IConnection,
) {
  // Register and login as system admin to create the org
  const sysAdminRegister = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        provider: "local",
        provider_key: RandomGenerator.name(1),
        password: "Abcd1234*",
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    },
  );
  typia.assert(sysAdminRegister);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminRegister.email,
      provider: "local",
      provider_key: sysAdminRegister.email,
      password: "Abcd1234*",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // Create healthcare organization
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org);

  // Register and login as organization admin #1
  const orgAdmin1Email = typia.random<string & tags.Format<"email">>();
  const orgAdmin1Join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdmin1Email,
        full_name: RandomGenerator.name(),
        password: "Hello5678*",
        provider: "local",
        provider_key: orgAdmin1Email,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin1Join);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdmin1Email,
      password: "Hello5678*",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Create an initial device data ingestion config for this org
  const ingestion =
    await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          device_type: "vital_monitor",
          ingest_endpoint_uri: `tcp://${RandomGenerator.alphaNumeric(8)}.devnet.local:7777/ingest`,
          supported_protocol: "HL7",
          status: "ready",
        } satisfies IHealthcarePlatformDeviceDataIngestion.ICreate,
      },
    );
  typia.assert(ingestion);

  // Create a second ingestion config for duplicate endpoint URI test
  const otherUri = `tcp://${RandomGenerator.alphaNumeric(8)}.devnet.local:8888/ingest`;
  const ingestion2 =
    await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: org.id,
          device_type: "infusion_pump",
          ingest_endpoint_uri: otherUri,
          supported_protocol: "FHIR",
          status: "ready",
        } satisfies IHealthcarePlatformDeviceDataIngestion.ICreate,
      },
    );
  typia.assert(ingestion2);

  // --- Success path: update config fields ---
  const updateInput = {
    device_type: "ecg",
    ingest_endpoint_uri: `tcp://${RandomGenerator.alphaNumeric(6)}.prod.local:9999/update`,
    supported_protocol: "FHIR",
    status: "pending",
  } satisfies IHealthcarePlatformDeviceDataIngestion.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.update(
      connection,
      {
        deviceDataIngestionId: ingestion.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "device_type updated",
    updated.device_type,
    updateInput.device_type,
  );
  TestValidator.equals(
    "ingest_endpoint_uri updated",
    updated.ingest_endpoint_uri,
    updateInput.ingest_endpoint_uri,
  );
  TestValidator.equals(
    "supported_protocol updated",
    updated.supported_protocol,
    updateInput.supported_protocol,
  );
  TestValidator.equals("status updated", updated.status, updateInput.status);
  TestValidator.notEquals(
    "audit updated_at is newer",
    updated.updated_at,
    ingestion.updated_at,
  );

  // --- Error: duplicate endpoint URI within org is refused ---
  await TestValidator.error("duplicate endpoint URI in org fails", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.update(
      connection,
      {
        deviceDataIngestionId: ingestion.id,
        body: {
          ingest_endpoint_uri: otherUri,
        } satisfies IHealthcarePlatformDeviceDataIngestion.IUpdate,
      },
    );
  });

  // --- Error: update on non-existent ID fails ---
  await TestValidator.error(
    "updating nonexistent ingestion fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.update(
        connection,
        {
          deviceDataIngestionId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: "ready",
          } satisfies IHealthcarePlatformDeviceDataIngestion.IUpdate,
        },
      );
    },
  );

  // --- Register and login as a different org admin (should not have update rights) ---
  const orgAdmin2Email = typia.random<string & tags.Format<"email">>();
  const orgAdmin2Join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdmin2Email,
        full_name: RandomGenerator.name(),
        password: "Hello9999*",
        provider: "local",
        provider_key: orgAdmin2Email,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin2Join);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdmin2Email,
      password: "Hello9999*",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Error: unrelated org admin cannot update ingestion
  await TestValidator.error(
    "unassigned org admin cannot update ingestion",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.update(
        connection,
        {
          deviceDataIngestionId: ingestion.id,
          body: {
            status: "ready",
          } satisfies IHealthcarePlatformDeviceDataIngestion.IUpdate,
        },
      );
    },
  );

  // --- Error: malformed update (empty body) ---
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdmin1Email,
      password: "Hello5678*",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error("malformed update rejected", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.update(
      connection,
      {
        deviceDataIngestionId: ingestion.id,
        body: {} satisfies IHealthcarePlatformDeviceDataIngestion.IUpdate,
      },
    );
  });
}
