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
 * Scenario: Test organization admin device data ingestion creation and error
 * constraints.
 *
 * 1. Create and login as system admin so org can be onboarded.
 * 2. Create a new organization, get id.
 * 3. Register and authenticate org admin.
 * 4. As org admin, create a device data ingestion linked to org id.
 * 5. Validate connector fields: id exists, org id matches, fields present,
 *    timestamps.
 * 6. Error: Try to create an ingestion for a random/inaccessible org id. Should
 *    fail.
 * 7. Error: Try to create a duplicate endpoint URI in the same org. Should fail.
 */
export async function test_api_device_data_ingestion_creation_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(10);
  const sysAdminJoin = {
    email: sysAdminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: sysAdminEmail,
    password: sysAdminPassword,
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoin,
  });
  typia.assert(sysAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 2. Create organization
  const orgCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgCreate },
    );
  typia.assert(org);

  // 3. Register and login as organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdminJoin = {
    email: orgAdminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: orgAdminPassword,
    provider: "local",
    provider_key: orgAdminEmail,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminJoin },
  );
  typia.assert(orgAdmin);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. As org admin, create device data ingestion
  const endpointUri = `https://api.device.${RandomGenerator.alphaNumeric(10)}.health/${RandomGenerator.alphaNumeric(6)}`;
  const createIngestionBody = {
    healthcare_platform_organization_id: org.id,
    device_type: "vital_monitor",
    ingest_endpoint_uri: endpointUri,
    supported_protocol: "HL7",
    status: "ready",
  } satisfies IHealthcarePlatformDeviceDataIngestion.ICreate;
  const ingestion =
    await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.create(
      connection,
      { body: createIngestionBody },
    );
  typia.assert(ingestion);
  TestValidator.equals(
    "ingestion org id matches org",
    ingestion.healthcare_platform_organization_id,
    org.id,
  );
  TestValidator.equals(
    "ingestion endpointUri match",
    ingestion.ingest_endpoint_uri,
    endpointUri,
  );
  TestValidator.equals("ingestion status", ingestion.status, "ready");
  TestValidator.predicate(
    "created_at exists",
    typeof ingestion.created_at === "string" && !!ingestion.created_at,
  );
  TestValidator.predicate(
    "updated_at exists",
    typeof ingestion.updated_at === "string" && !!ingestion.updated_at,
  );
  TestValidator.predicate(
    "id is uuid",
    typeof ingestion.id === "string" && ingestion.id.length > 10,
  );

  // 5. Error: Try as org admin to create for random org -- should error/403/400
  const createIngestionBodyBadOrg = {
    ...createIngestionBody,
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    ingest_endpoint_uri: `https://invalid-org.device.${RandomGenerator.alphaNumeric(10)}.health/${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IHealthcarePlatformDeviceDataIngestion.ICreate;
  await TestValidator.error(
    "creation with stray org id should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.create(
        connection,
        { body: createIngestionBodyBadOrg },
      );
    },
  );

  // 6. Error: Duplicate endpoint URI for same org
  const createIngestionBodyDupUri = {
    ...createIngestionBody,
    ingest_endpoint_uri: endpointUri,
  } satisfies IHealthcarePlatformDeviceDataIngestion.ICreate;
  await TestValidator.error(
    "creation with duplicate endpoint uri should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.create(
        connection,
        { body: createIngestionBodyDupUri },
      );
    },
  );
}
