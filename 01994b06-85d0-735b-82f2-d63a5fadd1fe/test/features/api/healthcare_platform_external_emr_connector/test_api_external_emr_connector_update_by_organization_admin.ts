import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformExternalEmrConnector";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate EMR connector update permissions and business logic for organization
 * admins.
 *
 * 1. System admin joins and logs in
 * 2. Organization admin1 joins and logs in
 * 3. System admin creates organization1
 * 4. Organization admin1 creates EMR connector for organization1
 * 5. Organization admin1 updates their EMR connector and sees changes take effect
 * 6. Organization admin2 joins and logs in
 * 7. System admin creates organization2
 * 8. Organization admin2 creates EMR connector for organization2
 * 9. Organization admin1 attempts to update organization2's EMR connector (should
 *    fail)
 * 10. Attempt update with invalid connector ID (should fail)
 */
export async function test_api_external_emr_connector_update_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. System admin joins
  const sysEmail = typia.random<string & tags.Format<"email">>();
  const sysPwd = RandomGenerator.alphaNumeric(12);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: sysPwd,
      provider: "local",
      provider_key: sysEmail,
    },
  });
  typia.assert(sysAdmin);

  // 2. Organization admin1 joins
  const orgAdminEmail1 = typia.random<string & tags.Format<"email">>();
  const orgAdminPwd1 = RandomGenerator.alphaNumeric(12);
  const orgAdmin1 = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail1,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPwd1,
        provider: undefined,
        provider_key: undefined,
      },
    },
  );
  typia.assert(orgAdmin1);

  // 3. System admin creates organization1
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysEmail,
      password: sysPwd,
      provider: "local",
      provider_key: sysEmail,
    },
  });
  const org1Input = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    status: "active",
  };
  const org1 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: org1Input,
      },
    );
  typia.assert(org1);

  // 4. Organization admin1 logs in and creates EMR connector for org1
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail1,
      password: orgAdminPwd1,
    },
  });
  const connector1Input = {
    healthcare_platform_organization_id: org1.id,
    connector_type: RandomGenerator.pick([
      "Epic",
      "Cerner",
      "AllScripts",
      "Meditech",
      "CustomVendorA",
    ] as const),
    connection_uri: `https://emr${RandomGenerator.alphaNumeric(8)}.example.com/api`,
    status: RandomGenerator.pick(["active", "inactive", "pending"]) as string,
  };
  const connector1 =
    await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.create(
      connection,
      {
        body: connector1Input,
      },
    );
  typia.assert(connector1);

  // 5. Organization admin1 updates their EMR connector
  const updatedConnectorType1 = RandomGenerator.pick([
    "Epic",
    "Cerner",
    "AllScripts",
    "Meditech",
    "CustomVendorA",
  ] as const);
  const updateBody1 = {
    connection_uri: `https://updated-${RandomGenerator.alphaNumeric(10)}.example.net/api`,
    connector_type: updatedConnectorType1,
    status: RandomGenerator.pick(["inactive", "pending", "active"]),
  };
  const updated1 =
    await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.update(
      connection,
      {
        externalEmrConnectorId: connector1.id,
        body: updateBody1,
      },
    );
  typia.assert(updated1);
  TestValidator.equals(
    "updated connection_uri",
    updated1.connection_uri,
    updateBody1.connection_uri,
  );
  TestValidator.equals(
    "updated connector_type",
    updated1.connector_type,
    updateBody1.connector_type,
  );
  TestValidator.equals("updated status", updated1.status, updateBody1.status);

  // 6. Organization admin2 joins
  const orgAdminEmail2 = typia.random<string & tags.Format<"email">>();
  const orgAdminPwd2 = RandomGenerator.alphaNumeric(12);
  const orgAdmin2 = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail2,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPwd2,
        provider: undefined,
        provider_key: undefined,
      },
    },
  );
  typia.assert(orgAdmin2);

  // 7. System admin creates organization2
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysEmail,
      password: sysPwd,
      provider: "local",
      provider_key: sysEmail,
    },
  });
  const org2Input = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(),
    status: "active",
  };
  const org2 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: org2Input,
      },
    );
  typia.assert(org2);

  // 8. Organization admin2 logs in and creates EMR connector for org2
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail2,
      password: orgAdminPwd2,
    },
  });
  const connector2Input = {
    healthcare_platform_organization_id: org2.id,
    connector_type: RandomGenerator.pick([
      "Epic",
      "Cerner",
      "AllScripts",
      "Meditech",
      "CustomVendorB",
    ] as const),
    connection_uri: `https://emr${RandomGenerator.alphaNumeric(7)}b.example.com/api`,
    status: RandomGenerator.pick(["active", "inactive"]),
  };
  const connector2 =
    await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.create(
      connection,
      {
        body: connector2Input,
      },
    );
  typia.assert(connector2);

  // 9. Organization admin1 logs in and attempts to update connector2 (should fail)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail1,
      password: orgAdminPwd1,
    },
  });
  await TestValidator.error(
    "organization admin1 cannot update another org's connector",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.update(
        connection,
        {
          externalEmrConnectorId: connector2.id,
          body: {
            connection_uri: `https://forbidden-update.example.com`,
            status: "inactive",
          },
        },
      );
    },
  );

  // 10. Invalid connector ID (random UUID)
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update fails for nonexistent connector ID",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.update(
        connection,
        {
          externalEmrConnectorId: randomUuid,
          body: { connection_uri: "https://no-such-connector.example.com" },
        },
      );
    },
  );
}
