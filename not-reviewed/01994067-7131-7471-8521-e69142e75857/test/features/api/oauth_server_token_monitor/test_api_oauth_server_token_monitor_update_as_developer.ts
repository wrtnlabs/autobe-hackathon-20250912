import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAccessToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerAuthorizationCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuthorizationCode";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import type { IOauthServerTokenMonitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerTokenMonitor";

export async function test_api_oauth_server_token_monitor_update_as_developer(
  connection: api.IConnection,
) {
  // 1. Developer user registration and authentication
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerPassword = "testpassword123";
  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        email_verified: true,
        password_hash: developerPassword,
      } satisfies IOauthServerDeveloper.ICreate,
    });
  typia.assert(developer);

  // 2. Create OAuth client by developer user
  const oauthClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.create(connection, {
      body: {
        client_id: RandomGenerator.alphaNumeric(16),
        client_secret: RandomGenerator.alphaNumeric(32),
        redirect_uri: "https://example.com/callback",
        is_trusted: true,
        logo_uri: null,
      } satisfies IOauthServerOauthClient.ICreate,
    });
  typia.assert(oauthClient);

  // 3. Create authorization code linked to the OAuth client
  const authorizationCode: IOauthServerAuthorizationCode =
    await api.functional.oauthServer.developer.authorizationCodes.create(
      connection,
      {
        body: {
          oauth_client_id: oauthClient.id,
          code: RandomGenerator.alphaNumeric(32),
          data: JSON.stringify({ scope: "read write" }),
          redirect_uri: oauthClient.redirect_uri,
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        } satisfies IOauthServerAuthorizationCode.ICreate,
      },
    );
  typia.assert(authorizationCode);

  // 4. Admin user registration and authentication for creating access token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "testpassword123";
  const adminUser: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 5. Create access token linked to OAuth client and authorization code
  const accessToken: IOauthServerAccessToken =
    await api.functional.oauthServer.admin.accessTokens.create(connection, {
      body: {
        oauth_client_id: oauthClient.id,
        authorization_code_id: authorizationCode.id,
        token: RandomGenerator.alphaNumeric(64),
        scope: "read write",
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      } satisfies IOauthServerAccessToken.ICreate,
    });
  typia.assert(accessToken);

  // 6. Developer user creates an OAuth server token monitor event
  const tokenMonitorEvent: IOauthServerTokenMonitor =
    await api.functional.oauthServer.developer.oauthServerTokenMonitors.create(
      connection,
      {
        body: {
          access_token_id: accessToken.id,
          oauth_client_id: oauthClient.id,
          event_type: "validation",
          event_timestamp: new Date().toISOString(),
          ip_address: `192.168.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}`,
          user_agent: "Mozilla/5.0",
          deleted_at: null,
        } satisfies IOauthServerTokenMonitor.ICreate,
      },
    );
  typia.assert(tokenMonitorEvent);

  // 7. Developer user performs updates on the token monitor event
  // Update event_type
  const updatedEventTypeNode: IOauthServerTokenMonitor =
    await api.functional.oauthServer.developer.oauthServerTokenMonitors.update(
      connection,
      {
        id: tokenMonitorEvent.id,
        body: {
          event_type: "expiration",
        } satisfies IOauthServerTokenMonitor.IUpdate,
      },
    );
  typia.assert(updatedEventTypeNode);
  TestValidator.equals(
    "event_type updated successfully",
    updatedEventTypeNode.event_type,
    "expiration",
  );

  // Update ip_address and user_agent
  const newIp = `10.0.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<255>>()}`;
  const newUserAgent = "curl/7.68.0";
  const updatedIpUserAgentNode: IOauthServerTokenMonitor =
    await api.functional.oauthServer.developer.oauthServerTokenMonitors.update(
      connection,
      {
        id: tokenMonitorEvent.id,
        body: {
          ip_address: newIp,
          user_agent: newUserAgent,
        } satisfies IOauthServerTokenMonitor.IUpdate,
      },
    );
  typia.assert(updatedIpUserAgentNode);
  TestValidator.equals(
    "ip_address updated successfully",
    updatedIpUserAgentNode.ip_address,
    newIp,
  );
  TestValidator.equals(
    "user_agent updated successfully",
    updatedIpUserAgentNode.user_agent,
    newUserAgent,
  );

  // 8. Switch to admin user and try to update token monitor - expect failure
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IOauthServerAdmin.ILogin,
  });

  await TestValidator.error(
    "admin user cannot update token monitor",
    async () => {
      await api.functional.oauthServer.developer.oauthServerTokenMonitors.update(
        connection,
        {
          id: tokenMonitorEvent.id,
          body: {
            event_type: "revocation",
          } satisfies IOauthServerTokenMonitor.IUpdate,
        },
      );
    },
  );

  // 9. Switch back to developer user for final update with null user_agent
  await api.functional.auth.developer.login(connection, {
    body: {
      email: developerEmail,
      password: developerPassword,
    } satisfies IOauthServerDeveloper.ILogin,
  });

  const finalUpdateNode: IOauthServerTokenMonitor =
    await api.functional.oauthServer.developer.oauthServerTokenMonitors.update(
      connection,
      {
        id: tokenMonitorEvent.id,
        body: {
          user_agent: null,
          event_timestamp: new Date().toISOString(),
        } satisfies IOauthServerTokenMonitor.IUpdate,
      },
    );
  typia.assert(finalUpdateNode);
  TestValidator.equals(
    "user_agent set to null successfully",
    finalUpdateNode.user_agent,
    null,
  );
}
