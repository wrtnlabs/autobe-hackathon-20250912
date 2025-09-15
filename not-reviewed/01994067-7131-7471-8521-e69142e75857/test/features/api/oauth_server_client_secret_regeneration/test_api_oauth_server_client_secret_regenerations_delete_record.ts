import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerClientSecretRegeneration } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientSecretRegeneration";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";

export async function test_api_oauth_server_client_secret_regenerations_delete_record(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "strong-password";

  const adminCreated: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(adminCreated);

  // Admin login to refresh authentication (redundant if join sets header)
  const adminLogged: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(adminLogged);

  // 2. Create OAuth client
  const oauthClientCreated: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: {
        client_id: RandomGenerator.alphaNumeric(16),
        client_secret: RandomGenerator.alphaNumeric(32),
        redirect_uri: "https://example.com/oauth_redirect",
        logo_uri: null,
        is_trusted: false,
      } satisfies IOauthServerOauthClient.ICreate,
    });
  typia.assert(oauthClientCreated);

  // 3. Create a client secret regeneration record
  const regenerationDate = new Date().toISOString();
  const regenerationReason = "Periodic security update";

  const secretRegenerationCreated: IOauthServerClientSecretRegeneration =
    await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.create(
      connection,
      {
        body: {
          oauth_client_id: oauthClientCreated.id,
          admin_id: adminCreated.id,
          regenerated_at: regenerationDate,
          reason: regenerationReason,
        } satisfies IOauthServerClientSecretRegeneration.ICreate,
      },
    );
  typia.assert(secretRegenerationCreated);

  // 4. Delete the client secret regeneration record by its ID
  await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.eraseSecretRegenerationRecord(
    connection,
    {
      id: secretRegenerationCreated.id,
    },
  );

  // 5. Attempt deletion again - expect error as record no longer exists
  await TestValidator.error(
    "deleting an already deleted client secret regeneration record should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.eraseSecretRegenerationRecord(
        connection,
        {
          id: secretRegenerationCreated.id,
        },
      );
    },
  );

  // 6. Attempt unauthorized deletion - new OAuth client and regeneration record with different auth context
  // Create a second admin and login to simulate different user
  const otherAdminEmail = typia.random<string & tags.Format<"email">>();
  const otherAdminPassword = "another-strong-password";

  const otherAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: otherAdminEmail,
        email_verified: true,
        password: otherAdminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(otherAdmin);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: otherAdminEmail,
      password: otherAdminPassword,
    } satisfies IOauthServerAdmin.ILogin,
  });

  // Create OAuth client and regeneration record under second admin
  const oauthClient2: IOauthServerOauthClient =
    await api.functional.oauthServer.admin.oauthClients.create(connection, {
      body: {
        client_id: RandomGenerator.alphaNumeric(16),
        client_secret: RandomGenerator.alphaNumeric(32),
        redirect_uri: "https://example.com/redirect2",
        logo_uri: null,
        is_trusted: false,
      } satisfies IOauthServerOauthClient.ICreate,
    });
  typia.assert(oauthClient2);

  const secretRegeneration2: IOauthServerClientSecretRegeneration =
    await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.create(
      connection,
      {
        body: {
          oauth_client_id: oauthClient2.id,
          admin_id: otherAdmin.id,
          regenerated_at: new Date().toISOString(),
          reason: "Second admin regeneration",
        } satisfies IOauthServerClientSecretRegeneration.ICreate,
      },
    );
  typia.assert(secretRegeneration2);

  // Attempt to delete the second regeneration record as unauthorized user by clearing auth (reset connection header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized deletion should fail", async () => {
    await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.eraseSecretRegenerationRecord(
      unauthConn,
      {
        id: secretRegeneration2.id,
      },
    );
  });

  // 7. Attempt to delete a non-existent secret regeneration record with a random UUID
  const randomUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deletion of non-existent record should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerClientSecretRegenerations.eraseSecretRegenerationRecord(
        connection,
        {
          id: randomUUID,
        },
      );
    },
  );
}
