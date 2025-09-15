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
 * E2E test for deletion of external EMR connectors by organization
 * administrators, including error scenarios.
 *
 * Validates:
 *
 * - Only a properly registered organizationAdmin can delete a connector for their
 *   organization
 * - Repeated delete attempts and attempts to delete non-existent connectors are
 *   handled with correct business errors
 * - Complete business workflow:
 *
 *   1. Register and authenticate as systemAdmin (required for organization creation)
 *   2. Create a new organization
 *   3. Register and authenticate as organizationAdmin
 *   4. Create an external EMR connector for the org
 *   5. Delete the connector as orgAdmin (success case)
 *   6. Attempt to delete same connector again (should fail)
 *   7. Attempt to delete random non-existent connector (should fail)
 */
export async function test_api_external_emr_connector_deletion_as_org_admin_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin (for organization creation)
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);

  // 2. Create a new organization
  const orgPayload = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: orgPayload,
      },
    );
  typia.assert(organization);

  // 3. Register and authenticate as organization admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);

  const orgAdminAuth = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminAuth);

  // 4. Create EMR connector as organizationAdmin
  const connectorPayload = {
    healthcare_platform_organization_id: organization.id,
    connector_type: RandomGenerator.pick([
      "Epic",
      "Cerner",
      "CustomEmr",
      "MockVendor",
    ] as const),
    connection_uri: `https://emr-${RandomGenerator.alphaNumeric(6)}.health.test/api`,
    status: "active",
  } satisfies IHealthcarePlatformExternalEmrConnector.ICreate;
  const emrConnector =
    await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.create(
      connection,
      {
        body: connectorPayload,
      },
    );
  typia.assert(emrConnector);
  TestValidator.equals(
    "created connector org matches organization",
    emrConnector.healthcare_platform_organization_id,
    organization.id,
  );

  // 5. Delete the connector
  await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.erase(
    connection,
    {
      externalEmrConnectorId: emrConnector.id,
    },
  );

  // 6. Try deleting the same connector again; expect error
  await TestValidator.error(
    "repeated delete on same EMR connector returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.erase(
        connection,
        {
          externalEmrConnectorId: emrConnector.id,
        },
      );
    },
  );

  // 7. Delete with a random non-existent UUID
  const fakeConnectorId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete of non-existent connector returns error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.erase(
        connection,
        {
          externalEmrConnectorId: fakeConnectorId,
        },
      );
    },
  );
}
