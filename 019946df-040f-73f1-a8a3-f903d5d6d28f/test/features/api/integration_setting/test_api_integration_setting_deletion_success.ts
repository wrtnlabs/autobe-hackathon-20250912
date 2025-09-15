import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsIntegrationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsIntegrationSettings";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

export async function test_api_integration_setting_deletion_success(
  connection: api.IConnection,
) {
  // 1. Create system admin user
  const systemAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "hashedpassword123456",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Login as system admin
  const systemAdminLoginBody = {
    email: systemAdmin.email,
    password_hash: "hashedpassword123456",
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loggedInAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Create integration setting
  // Use tenant_id from systemAdmin.tenant_id as it represents existing tenant
  const integrationSettingCreateBody = {
    tenant_id: systemAdmin.tenant_id,
    integration_name: RandomGenerator.paragraph({ sentences: 3 }),
    config_key: RandomGenerator.alphaNumeric(10),
    config_value: RandomGenerator.content({ paragraphs: 1 }),
    enabled: true,
  } satisfies IEnterpriseLmsIntegrationSettings.ICreate;

  const integrationSetting: IEnterpriseLmsIntegrationSettings =
    await api.functional.enterpriseLms.systemAdmin.integrationSettings.create(
      connection,
      {
        body: integrationSettingCreateBody,
      },
    );
  typia.assert(integrationSetting);

  // 4. Delete the created integration setting
  await api.functional.enterpriseLms.systemAdmin.integrationSettings.erase(
    connection,
    {
      id: integrationSetting.id,
    },
  );

  // 5. Verify that retrieving the deleted integration setting results in error
  // Since no retrieval API is provided, simulate check by attempting deletion again
  await TestValidator.error(
    "deletion of non-existent integration setting should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.integrationSettings.erase(
        connection,
        {
          id: integrationSetting.id,
        },
      );
    },
  );

  // 6. Attempt unauthorized deletion - simulate by using a new unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized deletion should fail", async () => {
    await api.functional.enterpriseLms.systemAdmin.integrationSettings.erase(
      unauthenticatedConnection,
      {
        id: integrationSetting.id,
      },
    );
  });
}
