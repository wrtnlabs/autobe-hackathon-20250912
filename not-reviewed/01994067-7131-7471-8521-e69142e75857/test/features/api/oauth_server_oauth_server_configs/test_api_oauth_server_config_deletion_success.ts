import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerOauthServerConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerConfigs";

export async function test_api_oauth_server_config_deletion_success(
  connection: api.IConnection,
) {
  // 1. Admin user joins the system
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IOauthServerAdmin.ICreate;

  const adminAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // 2. Admin user logs in
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IOauthServerAdmin.ILogin;

  const adminLoginResponse: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoginResponse);

  // 3. Create OAuth server config record
  const oauthServerConfigCreateBody = {
    key: `test_key_${RandomGenerator.alphaNumeric(8)}`,
    value: `test_value_${RandomGenerator.alphaNumeric(12)}`,
    description: `test_description_${RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 })}`,
  } satisfies IOauthServerOauthServerConfigs.ICreate;

  const createdConfig: IOauthServerOauthServerConfigs =
    await api.functional.oauthServer.admin.oauthServerConfigs.create(
      connection,
      { body: oauthServerConfigCreateBody },
    );
  typia.assert(createdConfig);

  // 4. Delete the config by ID
  await api.functional.oauthServer.admin.oauthServerConfigs.erase(connection, {
    id: createdConfig.id,
  });

  // 5. Attempt deletion again with the same ID - should fail
  await TestValidator.error(
    "deleting already deleted config should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerConfigs.erase(
        connection,
        {
          id: createdConfig.id,
        },
      );
    },
  );

  // 6. Attempt deletion with a random non-existent ID - should fail
  await TestValidator.error(
    "deleting non-existent config should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerConfigs.erase(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
