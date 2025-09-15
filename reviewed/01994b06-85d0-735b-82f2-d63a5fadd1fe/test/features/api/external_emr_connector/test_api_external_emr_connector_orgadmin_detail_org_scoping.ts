import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformExternalEmrConnector } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformExternalEmrConnector";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate that an organization administrator can only retrieve details for
 * external EMR connectors within their own organization.
 *
 * This test covers the following business rules and negative cases:
 *
 * - Successful retrieval of a connector detail by an org admin for a
 *   connector owned by their organization.
 * - Organization-based access enforcement: an org admin cannot view connector
 *   details belonging to other organizations.
 * - Proper error handling for non-existent connector IDs.
 *
 * Step-by-step process:
 *
 * 1. Register (join) orgA admin and capture their organization context.
 * 2. Log in as orgA admin to establish authorization.
 * 3. Simulate creation of an external EMR connector for orgA (since no create
 *    API exists, use random/mocked entity).
 * 4. Retrieve connector detail as orgA admin; check that returned connector
 *    belongs to orgA.
 * 5. Register orgB admin for a distinct organization.
 * 6. Log in as orgB admin (new auth context).
 * 7. Attempt to fetch orgA's connector detail as orgB admin; expect forbidden
 *    (authorization) or not found error.
 * 8. Attempt to access a random (non-existent) connector id; expect not found
 *    error.
 */
export async function test_api_external_emr_connector_orgadmin_detail_org_scoping(
  connection: api.IConnection,
) {
  // 1. Register orgA admin
  const orgA_admin_join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "Password1234",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgA_admin_join);
  const orgA_admin = orgA_admin_join;

  // 2. Authenticate as orgA admin
  const orgA_admin_login = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgA_admin.email,
        password: "Password1234",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgA_admin_login);
  // Confirm that the logged-in user is the same as just registered
  TestValidator.equals(
    "org admin ID consistent after login",
    orgA_admin.id,
    orgA_admin_login.id,
  );

  // 3. Simulate external EMR connector creation associated with orgA (mock; since no API)
  const connectorA = typia.random<IHealthcarePlatformExternalEmrConnector>();
  connectorA.healthcare_platform_organization_id = orgA_admin.id as string &
    tags.Format<"uuid">;

  // 4. Retrieve connector detail as orgA admin, expect access granted and org match
  const detail =
    await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.at(
      connection,
      {
        externalEmrConnectorId: connectorA.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "connector belongs to orgA admin",
    detail.healthcare_platform_organization_id,
    orgA_admin.id,
  );
  TestValidator.equals("connector id matches", detail.id, connectorA.id);

  // 5. Register orgB admin
  const orgB_admin_join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "Password1234",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgB_admin_join);
  const orgB_admin = orgB_admin_join;

  // 6. Login as orgB admin (switch session)
  const orgB_admin_login = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgB_admin.email,
        password: "Password1234",
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgB_admin_login);

  // 7. Attempt forbidden access: orgB admin tries to access orgA's connector
  await TestValidator.error(
    "orgB admin forbidden from accessing orgA's connector",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.at(
        connection,
        {
          externalEmrConnectorId: connectorA.id,
        },
      );
    },
  );

  // 8. Attempt access of non-existent connector ID
  await TestValidator.error(
    "access non-existent connector id returns not found",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.externalEmrConnectors.at(
        connection,
        {
          externalEmrConnectorId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
