import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate end-to-end creation of a device data ingestion configuration by a
 * system administrator.
 *
 * 1. Register and login as system admin (with unique business email, full name,
 *    password, provider info).
 * 2. Provision a new healthcare organization (unique code and name, status
 *    active).
 * 3. Create device data ingestion with valid organization id and proper metadata
 *    (device type, endpoint URI, protocol, status).
 * 4. Confirm response includes all linkage and audit fields and matches input.
 * 5. Attempt duplicate ingestion (same orgId and endpoint_uri), confirm error.
 * 6. Attempt ingestion with invalid org ID, confirm error.
 * 7. Attempt ingestion with missing org ID, confirm error. Business rules: only
 *    sysadmin can create; duplicate URIs error; org ID required and must exist;
 *    audit on output.
 */
export async function test_api_device_data_ingestion_creation_with_valid_organization_id(
  connection: api.IConnection,
) {
  // Step 1: Register system admin
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@enterprise-autobe.com`;
  const joinAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: "TestAdminPassw0rd!",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(joinAdmin);

  // Step 2: Login as system admin
  const loginAdmin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: "TestAdminPassw0rd!",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginAdmin);

  // Step 3: Create new organization
  const orgCode = `org_${RandomGenerator.alphaNumeric(12)}`;
  const orgBody = {
    code: orgCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody },
    );
  typia.assert(organization);
  TestValidator.equals("created org code matches", organization.code, orgCode);

  // Step 4: Create new device data ingestion config for this org (happy path)
  const ingestionInput = {
    healthcare_platform_organization_id: organization.id,
    device_type: "vital_monitor",
    ingest_endpoint_uri: `https://device-ingest${RandomGenerator.alphaNumeric(10)}.healthcare.com/api`,
    supported_protocol: "HL7",
    status: "ready",
  } satisfies IHealthcarePlatformDeviceDataIngestion.ICreate;
  const ingestion =
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.create(
      connection,
      { body: ingestionInput },
    );
  typia.assert(ingestion);
  TestValidator.equals(
    "linkage org id matches",
    ingestion.healthcare_platform_organization_id,
    organization.id,
  );
  TestValidator.equals(
    "device type matches",
    ingestion.device_type,
    "vital_monitor",
  );
  TestValidator.equals("protocol matches", ingestion.supported_protocol, "HL7");
  TestValidator.equals(
    "endpoint uri matches",
    ingestion.ingest_endpoint_uri,
    ingestionInput.ingest_endpoint_uri,
  );
  TestValidator.equals("status matches", ingestion.status, "ready");
  TestValidator.predicate(
    "uuid assigned",
    typeof ingestion.id === "string" && ingestion.id.length > 0,
  );
  TestValidator.predicate(
    "created_at present",
    typeof ingestion.created_at === "string" && ingestion.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof ingestion.updated_at === "string" && ingestion.updated_at.length > 0,
  );

  // Step 5: Attempt duplicate creation with same org id and endpoint uri
  await TestValidator.error(
    "duplicate endpoint URI for same org should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.create(
        connection,
        {
          body: ingestionInput,
        },
      );
    },
  );

  // Step 6: Attempt creation with invalid/non-existent org id
  const invalidInput = {
    ...ingestionInput,
    healthcare_platform_organization_id: typia.random<
      string & tags.Format<"uuid">
    >(),
  } satisfies IHealthcarePlatformDeviceDataIngestion.ICreate;
  await TestValidator.error("invalid org id should fail", async () => {
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.create(
      connection,
      {
        body: invalidInput,
      },
    );
  });

  // Step 7: Attempt creation with missing org id (should fail compile, won't implement)
}
