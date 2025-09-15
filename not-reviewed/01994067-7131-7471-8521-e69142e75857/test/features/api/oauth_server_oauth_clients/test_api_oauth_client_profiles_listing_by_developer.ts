import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerClientProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientProfile";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerOauthClient } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthClient";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerClientProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerClientProfile";

/**
 * Tests the listing of OAuth client profiles for a developer's OAuth client.
 *
 * This scenario covers developer user registration and login, OAuth client
 * creation, client profile creation under the OAuth client, and listing client
 * profiles with pagination and filtering.
 *
 * It validates that only authorized developers can view client profiles of
 * OAuth clients they own, with proper pagination and filter behaviors.
 *
 * It also tests edge cases of empty listings and unauthorized access denial.
 */
export async function test_api_oauth_client_profiles_listing_by_developer(
  connection: api.IConnection,
) {
  // 1. Developer join
  const developerEmail: string = typia.random<string & tags.Format<"email">>();
  const developerPassword = RandomGenerator.alphaNumeric(12); // plaintext password for login
  const developerPasswordHash = RandomGenerator.alphaNumeric(32); // simulated password hash
  const developerJoinBody = {
    email: developerEmail,
    email_verified: true,
    password_hash: developerPasswordHash,
  } satisfies IOauthServerDeveloper.ICreate;

  const joinedDeveloper: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: developerJoinBody,
    });
  typia.assert(joinedDeveloper);

  // 2. Developer login (using plaintext password)
  const developerLoginBody = {
    email: developerEmail,
    password: developerPassword,
  } satisfies IOauthServerDeveloper.ILogin;

  // For test coherence, login with actual password string (even if backend uses hashed internally)
  await api.functional.auth.developer.login(connection, {
    body: developerLoginBody,
  });

  // 3. Create OAuth client
  const clientLogoUriOrNull =
    Math.random() > 0.5
      ? `https://example.com/logo/${RandomGenerator.alphaNumeric(6)}.png`
      : null;
  const oauthClientBody = {
    client_id: RandomGenerator.alphaNumeric(10),
    client_secret: RandomGenerator.alphaNumeric(32),
    redirect_uri: `https://example.com/callback/${RandomGenerator.alphaNumeric(6)}`,
    logo_uri: clientLogoUriOrNull,
    is_trusted: true,
  } satisfies IOauthServerOauthClient.ICreate;

  const createdClient: IOauthServerOauthClient =
    await api.functional.oauthServer.developer.oauthClients.create(connection, {
      body: oauthClientBody,
    });
  typia.assert(createdClient);

  // 4. Create multiple client profiles linked to the OAuth client
  const profileCount = RandomGenerator.pick([2, 3, 4, 5]) as number;
  const createdProfiles: IOauthServerClientProfile[] = [];
  for (let i = 0; i < profileCount; i++) {
    const profileBody = {
      oauth_client_id: createdClient.id,
      nickname: RandomGenerator.name(),
      description:
        Math.random() > 0.5
          ? RandomGenerator.paragraph({ sentences: 3 })
          : null,
    } satisfies IOauthServerClientProfile.ICreate;

    const createdProfile =
      await api.functional.oauthServer.developer.oauthClients.clientProfiles.create(
        connection,
        {
          oauthClientId: createdClient.id,
          body: profileBody,
        },
      );
    typia.assert(createdProfile);
    createdProfiles.push(createdProfile);
  }

  // 5. List client profiles with pagination and optional filtering
  const listRequestBody = {
    page: 0,
    limit: 10,
  } satisfies IOauthServerClientProfile.IRequest;

  const listedProfilesPage: IPageIOauthServerClientProfile =
    await api.functional.oauthServer.developer.oauthClients.clientProfiles.index(
      connection,
      {
        oauthClientId: createdClient.id,
        body: listRequestBody,
      },
    );
  typia.assert(listedProfilesPage);

  // Validate listed profiles include created ones
  const listedProfileIds = listedProfilesPage.data.map((p) => p.id);
  for (const profile of createdProfiles) {
    TestValidator.predicate(
      `created profile id ${profile.id} is included in listing`,
      listedProfileIds.includes(profile.id),
    );
  }

  // Validate pagination
  TestValidator.equals(
    "pagination limit matches request",
    listedProfilesPage.pagination.limit,
    listRequestBody.limit,
  );
  TestValidator.equals(
    "pagination current page matches request",
    listedProfilesPage.pagination.current,
    listRequestBody.page,
  );

  // Test filter by nickname
  const filterNickname =
    createdProfiles.length > 0 ? createdProfiles[0].nickname : null;
  if (filterNickname !== null) {
    const filteredRequestBody = {
      ...listRequestBody,
      nickname: filterNickname,
    } satisfies IOauthServerClientProfile.IRequest;

    const filteredProfilesPage: IPageIOauthServerClientProfile =
      await api.functional.oauthServer.developer.oauthClients.clientProfiles.index(
        connection,
        {
          oauthClientId: createdClient.id,
          body: filteredRequestBody,
        },
      );
    typia.assert(filteredProfilesPage);

    for (const profile of filteredProfilesPage.data) {
      TestValidator.equals(
        `filtered profile nickname matches ${filterNickname}`,
        profile.nickname,
        filterNickname,
      );
    }
  }

  // Test empty profile list by filtering with non-existent nickname
  const emptyFilterBody = {
    ...listRequestBody,
    nickname: `nonexistent_${RandomGenerator.alphaNumeric(10)}`,
  } satisfies IOauthServerClientProfile.IRequest;

  const emptyProfilesPage: IPageIOauthServerClientProfile =
    await api.functional.oauthServer.developer.oauthClients.clientProfiles.index(
      connection,
      {
        oauthClientId: createdClient.id,
        body: emptyFilterBody,
      },
    );
  typia.assert(emptyProfilesPage);
  TestValidator.equals(
    "empty profile list data length",
    emptyProfilesPage.data.length,
    0,
  );

  // Test unauthorized access: try listing profiles with a different developer
  const otherDeveloperEmail = typia.random<string & tags.Format<"email">>();
  const otherDeveloperPassword = RandomGenerator.alphaNumeric(12);
  const otherDeveloperPasswordHash = RandomGenerator.alphaNumeric(32);
  const otherJoinBody = {
    email: otherDeveloperEmail,
    email_verified: true,
    password_hash: otherDeveloperPasswordHash,
  } satisfies IOauthServerDeveloper.ICreate;

  const otherDeveloper: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: otherJoinBody,
    });
  typia.assert(otherDeveloper);

  const otherLoginBody = {
    email: otherDeveloperEmail,
    password: otherDeveloperPassword,
  } satisfies IOauthServerDeveloper.ILogin;

  await api.functional.auth.developer.login(connection, {
    body: otherLoginBody,
  });

  await TestValidator.error(
    "access denied for unauthorized developer",
    async () => {
      await api.functional.oauthServer.developer.oauthClients.clientProfiles.index(
        connection,
        {
          oauthClientId: createdClient.id,
          body: listRequestBody,
        },
      );
    },
  );
}
