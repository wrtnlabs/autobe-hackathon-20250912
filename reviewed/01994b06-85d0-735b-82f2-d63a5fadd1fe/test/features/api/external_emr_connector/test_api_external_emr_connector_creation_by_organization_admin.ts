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
 * Test that an organization administrator can add an external EMR connector for
 * their organization, enforcing permission boundaries, required fields, and
 * uniqueness.
 *
 * Steps:
 *
 * 1. System admin creates and logs in
 * 2. System admin creates a new organization (orgA)
 * 3. Organization admin creates and logs in
 * 4. Organization admin adds an EMR connector to their org (should succeed)
 * 5. Same org admin attempts to add connector for a different org (should fail)
 * 6. Same org admin attempts to add duplicate connector type for same org
 *    (uniqueness violation - should fail)
 * 7. Missing required field: connection_uri set to empty string (should fail at
 *    business validation)
 * 8. Malformed connection_uri (not a URL) - should fail
 */
export async function test_api_external_emr_connector_creation_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Create and login as system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(10);
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(sysAdmin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // 2. System admin creates organization
  const organizationCode = RandomGenerator.alphaNumeric(12);
  const organizationName = RandomGenerator.name(2);
  const organization: IHealthcarePlatformOrganization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: organizationCode,
          name: organizationName,
          status: "active",
        },
      },
    );
  typia.assert(organization);

  // 3. Create and login as org admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(10);
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
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

  // 4. Organization admin creates external EMR connector for their org
  const connectorType = RandomGenerator.pick([
    "Epic",
    "Cerner",
    "AllScripts",
    "Custom",
  ] as const);
  const connectorUri = `https://emr.${RandomGenerator.alphaNumeric(8)}.example.com/api`;
  const status = "active";
  const createInput = {
    healthcare_platform_organization_id: organization.id,
    connector_type: connectorType,
    connection_uri: connectorUri,
    status,
  } satisfies IHealthcarePlatformExternalEmrConnector.ICreate;

  const connector: IHealthcarePlatformExternalEmrConnector =
    await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.create(
      connection,
      { body: createInput },
    );
  typia.assert(connector);
  TestValidator.equals(
    "organization id matches",
    connector.healthcare_platform_organization_id,
    organization.id,
  );
  TestValidator.equals("type matches", connector.connector_type, connectorType);
  TestValidator.equals("uri matches", connector.connection_uri, connectorUri);
  TestValidator.equals("status matches", connector.status, status);

  // 5. Try to create with an invalid organization id (should fail)
  await TestValidator.error(
    "cross-org connector creation should be denied",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.create(
        connection,
        {
          body: {
            ...createInput,
            healthcare_platform_organization_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    },
  );

  // 6. Duplicate (unique type/org) should fail
  await TestValidator.error(
    "duplicate EMR connector (type/org) violates uniqueness",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.create(
        connection,
        {
          body: createInput,
        },
      );
    },
  );

  // 7. Attempt with missing required fields
  await TestValidator.error("missing required connection_uri", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.create(
      connection,
      {
        body: {
          ...createInput,
          connection_uri: "",
        },
      },
    );
  });

  // 8. Malformed input: non-URL connection_uri
  await TestValidator.error("malformed connection_uri rejected", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.create(
      connection,
      {
        body: {
          ...createInput,
          connection_uri: "not-a-uri",
        },
      },
    );
  });
}
