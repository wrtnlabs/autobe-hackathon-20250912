import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformExternalEmrConnector";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin creation of external EMR connector for an organization,
 * including duplicate, constraint, and business error scenarios.
 *
 * The test:
 *
 * 1. Registers as a valid system administrator
 * 2. Creates a new platform organization
 * 3. Creates a new EMR connector with all required fields, validates all output
 *    fields
 * 4. Confirms attempting to create a duplicate connector for same org+type fails
 *    (uniqueness)
 * 5. Confirms business-logic negative scenarios:
 *
 *    - Invalid connector_type
 *    - Connection_uri exceeding maximum length
 *    - Creating for a non-existent org
 *    - Invalid status string
 *
 * Negative test cases involving deliberate omission of required fields or type
 * errors (such as missing required fields) are excluded per E2E policy.
 */
export async function test_api_external_emr_connector_creation_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = `${RandomGenerator.alphabets(8)}@autobe-e2e.com`;
  const joinOutput = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(joinOutput);

  // 2. Create a healthcare organization
  const orgBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const org =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgBody },
    );
  typia.assert(org);
  TestValidator.equals("org code matches request", org.code, orgBody.code);
  TestValidator.equals("org status active", org.status, "active");
  const organizationId = org.id;

  // 3. Create a new EMR connector
  const connectorBody = {
    healthcare_platform_organization_id: organizationId,
    connector_type: "epic",
    connection_uri: `https://emr-${RandomGenerator.alphaNumeric(10)}.example.com/connect`,
    status: "active",
  } satisfies IHealthcarePlatformExternalEmrConnector.ICreate;
  const connector =
    await api.functional.healthcarePlatform.systemAdmin.externalEmrConnectors.create(
      connection,
      { body: connectorBody },
    );
  typia.assert(connector);
  TestValidator.equals(
    "connector org_id matches",
    connector.healthcare_platform_organization_id,
    organizationId,
  );
  TestValidator.equals(
    "connector_type matches",
    connector.connector_type,
    connectorBody.connector_type,
  );
  TestValidator.equals(
    "status matches input",
    connector.status,
    connectorBody.status,
  );
  TestValidator.equals(
    "connection_uri matches",
    connector.connection_uri,
    connectorBody.connection_uri,
  );
  TestValidator.predicate(
    "connector id is UUID",
    typeof connector.id === "string" && connector.id.length > 20,
  );

  // 4. Attempt to create duplicate connector (same org+type)
  await TestValidator.error(
    "duplicate connector (same org and connector_type) should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.externalEmrConnectors.create(
        connection,
        { body: connectorBody },
      );
    },
  );

  // 5. Invalid connector_type (nonexistent vendor)
  await TestValidator.error(
    "invalid connector_type (nonexistent vendor) should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.externalEmrConnectors.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: organizationId,
            connector_type: "invalid_vendor_type",
            connection_uri: `https://emr-${RandomGenerator.alphaNumeric(10)}.example.com/x`,
            status: "active",
          } satisfies IHealthcarePlatformExternalEmrConnector.ICreate,
        },
      );
    },
  );

  // 6. connection_uri exceeding max length (over 80,000 chars)
  await TestValidator.error(
    "connection_uri too long (over 80,000 chars) should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.externalEmrConnectors.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: organizationId,
            connector_type: "epic",
            connection_uri: "1".repeat(80001),
            status: "active",
          } satisfies IHealthcarePlatformExternalEmrConnector.ICreate,
        },
      );
    },
  );

  // 7. Non-existent org id
  await TestValidator.error(
    "non-existent organization id should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.externalEmrConnectors.create(
        connection,
        {
          body: {
            healthcare_platform_organization_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            connector_type: "epic",
            connection_uri: `https://emr-${RandomGenerator.alphaNumeric(10)}.example.com/y`,
            status: "active",
          } satisfies IHealthcarePlatformExternalEmrConnector.ICreate,
        },
      );
    },
  );

  // 8. Invalid status string
  await TestValidator.error("invalid status string should fail", async () => {
    await api.functional.healthcarePlatform.systemAdmin.externalEmrConnectors.create(
      connection,
      {
        body: {
          healthcare_platform_organization_id: organizationId,
          connector_type: "epic",
          connection_uri: `https://emr-${RandomGenerator.alphaNumeric(10)}.example.com/z`,
          status: "bad_status_string",
        } satisfies IHealthcarePlatformExternalEmrConnector.ICreate,
      },
    );
  });
}
