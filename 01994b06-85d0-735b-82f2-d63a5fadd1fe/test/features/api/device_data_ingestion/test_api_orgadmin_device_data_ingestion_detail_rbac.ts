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
 * Validate RBAC for organization admin retrieving device data ingestion detail.
 *
 * 1. Register/login system admin.
 * 2. Create OrgA and OrgB as system admin.
 * 3. Register and login OrgAdmin, assigned to OrgA.
 * 4. OrgAdmin creates device data ingestion in OrgA.
 * 5. SystemAdmin creates device data ingestion in OrgB.
 * 6. OrgAdmin fetches their org's device data ingestion — should succeed.
 * 7. OrgAdmin attempts to fetch OrgB's ingestion — should fail with permission
 *    error or not found.
 */
export async function test_api_orgadmin_device_data_ingestion_detail_rbac(
  connection: api.IConnection,
) {
  // 1. Register/login system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdmin);

  // 2. Create OrgA and OrgB as system admin
  const orgA =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: "OrganizationA",
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(orgA);
  const orgB =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: "OrganizationB",
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(orgB);

  // 3. Register OrgAdmin for OrgA
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdmin);

  // Re-login as org admin to ensure proper session
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 4. OrgAdmin creates device data ingestion in OrgA
  const orgAIngestion =
    await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgA.id,
          device_type: "vital_monitor",
          ingest_endpoint_uri: `https://devicestream-${RandomGenerator.alphaNumeric(8)}.orga.com`,
          supported_protocol: "FHIR",
          status: "ready",
        } satisfies IHealthcarePlatformDeviceDataIngestion.ICreate,
      },
    );
  typia.assert(orgAIngestion);

  // 5. Re-login as system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 5b. SystemAdmin creates device data ingestion in OrgB
  const orgBIngestion =
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgB.id,
          device_type: "ecg",
          ingest_endpoint_uri: `https://devicestream-${RandomGenerator.alphaNumeric(8)}.orgb.com`,
          supported_protocol: "HL7",
          status: "ready",
        } satisfies IHealthcarePlatformDeviceDataIngestion.ICreate,
      },
    );
  typia.assert(orgBIngestion);

  // 6. Re-login as org admin for RBAC read
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 7. OrgAdmin retrieves own org's device data ingestion detail
  const orgAIngestionDetail =
    await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.at(
      connection,
      {
        deviceDataIngestionId: orgAIngestion.id,
      },
    );
  typia.assert(orgAIngestionDetail);
  TestValidator.equals(
    "org admin can retrieve own org's ingestion detail",
    orgAIngestionDetail.id,
    orgAIngestion.id,
  );
  TestValidator.equals(
    "organization ID matches",
    orgAIngestionDetail.healthcare_platform_organization_id,
    orgA.id,
  );

  // 8. OrgAdmin attempts to access other org's ingestion (permission denied)
  await TestValidator.error(
    "org admin cannot access device data ingestion of another org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.at(
        connection,
        {
          deviceDataIngestionId: orgBIngestion.id,
        },
      );
    },
  );
}
