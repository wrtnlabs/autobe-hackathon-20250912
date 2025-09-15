import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDeviceDataIngestion";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformDeviceDataIngestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformDeviceDataIngestion";

/**
 * Validate org admin device data ingestion pagination & scoping.
 *
 * 1. Register & authenticate a system admin.
 * 2. System admin creates org A and org B.
 * 3. Register & authenticate an org admin for org A.
 * 4. Org admin creates device data ingestion records for org A.
 * 5. System admin creates device data ingestion records for org B.
 * 6. Org admin lists device data ingestion (with and without filters): confirm
 *    only org A records returned, pagination correct.
 * 7. Query with filters for org B: confirm access denied or empty result.
 */
export async function test_api_orgadmin_device_data_ingestion_pagination_and_scope(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a system admin
  const sysEmail = typia.random<string & tags.Format<"email">>();
  const sysPassword = RandomGenerator.alphaNumeric(12);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysEmail,
      password: sysPassword,
    },
  });
  typia.assert(sysAdmin);

  // 2. System admin creates org A and org B
  const orgA =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(orgA);
  const orgB =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          status: "active",
        },
      },
    );
  typia.assert(orgB);

  // 3. Register and authenticate an org admin for org A
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
      },
    },
  );
  typia.assert(orgAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });

  // 4. Org admin creates device data ingestions for org A
  const orgARecords = ArrayUtil.repeat(
    5,
    () =>
      ({
        device_type: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 15,
        }),
        ingest_endpoint_uri: `https://device-a${RandomGenerator.alphaNumeric(5)}.example.com`,
        supported_protocol: RandomGenerator.pick([
          "HL7",
          "FHIR",
          "custom",
          "MQTT",
        ] as const),
        status: RandomGenerator.pick(["ready", "pending", "error"] as const),
        healthcare_platform_organization_id: orgA.id,
      }) satisfies IHealthcarePlatformDeviceDataIngestion.ICreate,
  );
  const orgAResults: IHealthcarePlatformDeviceDataIngestion[] = [];
  for (const input of orgARecords) {
    const result =
      await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.create(
        connection,
        { body: input },
      );
    typia.assert(result);
    orgAResults.push(result);
  }

  // 5. System admin creates device data ingestions for org B
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysEmail,
      password: sysPassword,
      provider: "local",
      provider_key: sysEmail,
    },
  });
  const orgBRecords = ArrayUtil.repeat(
    4,
    () =>
      ({
        device_type: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 15,
        }),
        ingest_endpoint_uri: `https://device-b${RandomGenerator.alphaNumeric(5)}.example.com`,
        supported_protocol: RandomGenerator.pick([
          "HL7",
          "FHIR",
          "custom",
          "MQTT",
        ] as const),
        status: RandomGenerator.pick(["ready", "pending", "error"] as const),
        healthcare_platform_organization_id: orgB.id,
      }) satisfies IHealthcarePlatformDeviceDataIngestion.ICreate,
  );
  for (const input of orgBRecords) {
    await api.functional.healthcarePlatform.systemAdmin.deviceDataIngestions.create(
      connection,
      { body: input },
    );
  }

  // 6. Switch back to org admin and paginated listing
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    },
  });
  const pageSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  // Paginate: page 1
  const page1 =
    await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.index(
      connection,
      {
        body: {
          page: 1 satisfies number as number,
          page_size: pageSize,
        },
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "First page only contains orgA records",
    page1.data.every((d) => d.healthcare_platform_organization_id === orgA.id),
  );
  TestValidator.equals(
    "First page size correct",
    page1.data.length,
    Math.min(pageSize, orgAResults.length),
  );

  // Paginate: page 2
  const page2 =
    await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.index(
      connection,
      {
        body: {
          page: 2 satisfies number as number,
          page_size: pageSize,
        },
      },
    );
  typia.assert(page2);
  TestValidator.predicate(
    "Second page only contains orgA records",
    page2.data.every((d) => d.healthcare_platform_organization_id === orgA.id),
  );
  TestValidator.equals(
    "Second page size correct",
    page2.data.length,
    Math.max(0, orgAResults.length - pageSize),
  );

  // 7. Cross-org query: org admin tries to filter for org B
  const crossOrgAttempt =
    await api.functional.healthcarePlatform.organizationAdmin.deviceDataIngestions.index(
      connection,
      {
        body: {
          healthcare_platform_organization_id: orgB.id,
          page: 1 satisfies number as number,
          page_size: pageSize,
        },
      },
    );
  typia.assert(crossOrgAttempt);
  TestValidator.predicate(
    "Cross-org query returns only orgA records (protected)",
    crossOrgAttempt.data.every(
      (d) => d.healthcare_platform_organization_id === orgA.id,
    ),
  );
  TestValidator.equals(
    "Cross-org query result length should be 0",
    crossOrgAttempt.data.length,
    0,
  );
}
