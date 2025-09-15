import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformExternalEmrConnector";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate end-to-end deletion of an external EMR connector as a system
 * administrator.
 *
 * 1. Register and authenticate as a system administrator using valid credentials
 * 2. Create a new organization to act as connector owner
 * 3. Create a new external EMR connector for that organization
 * 4. Delete the EMR connector as the system admin by its ID
 * 5. Attempt to delete it again (edge case: already deleted/non-existent)
 * 6. Verify success, proper error handling, and no leakage
 */
export async function test_api_external_emr_connector_deletion_as_system_admin_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as system administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: adminEmail,
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(adminJoin);

  // 2. Create a new organization
  const orgInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org: IHealthcarePlatformOrganization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgInput },
    );
  typia.assert(org);

  // 3. Create external EMR connector
  const connectorInput = {
    healthcare_platform_organization_id: org.id,
    connector_type: RandomGenerator.paragraph({ sentences: 1 }),
    connection_uri:
      "https://" + RandomGenerator.alphaNumeric(12) + ".emr-vendor.com/api",
    status: "active",
  } satisfies IHealthcarePlatformExternalEmrConnector.ICreate;
  const connector: IHealthcarePlatformExternalEmrConnector =
    await api.functional.healthcarePlatform.systemAdmin.externalEmrConnectors.create(
      connection,
      { body: connectorInput },
    );
  typia.assert(connector);
  TestValidator.equals(
    "organization id matches",
    connector.healthcare_platform_organization_id,
    org.id,
  );
  TestValidator.equals(
    "connector type matches",
    connector.connector_type,
    connectorInput.connector_type,
  );

  // 4. Delete the EMR connector (normal case)
  await api.functional.healthcarePlatform.systemAdmin.externalEmrConnectors.erase(
    connection,
    {
      externalEmrConnectorId: connector.id,
    },
  );
  // No result expected (void), but should not throw

  // 5. Attempt to delete again - should throw a business error
  await TestValidator.error(
    "deleting already-deleted or non-existent connector should error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.externalEmrConnectors.erase(
        connection,
        {
          externalEmrConnectorId: connector.id,
        },
      );
    },
  );

  // 6. Attempt to delete a completely random UUID (non-existent connector)
  await TestValidator.error(
    "deleting non-existent connector uuid should error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.externalEmrConnectors.erase(
        connection,
        {
          externalEmrConnectorId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
