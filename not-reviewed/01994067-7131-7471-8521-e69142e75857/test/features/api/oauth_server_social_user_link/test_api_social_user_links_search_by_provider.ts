import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerSocialUserLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialUserLink";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerSocialUserLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerSocialUserLink";

export async function test_api_social_user_links_search_by_provider(
  connection: api.IConnection,
) {
  // 1. Developer user registration and authentication
  const developerEmail = typia.random<string & tags.Format<"email">>();
  const developerPasswordHash = typia.random<string>();
  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        email_verified: true,
        password_hash: developerPasswordHash,
      } satisfies IOauthServerDeveloper.ICreate,
    });
  typia.assert(developer);

  // 2. Prepare filter parameters for social user links search
  // Use the developer id (UUID) to simulate realistic socialProviderId
  // (In real case, socialLoginProviderId is external to developer, so simulate a separate UUID)
  // For this test, generate a random valid UUID to represent 'socialLoginProviderId'
  const socialLoginProviderId = typia.random<string & tags.Format<"uuid">>();

  // Create filter criteria using IOauthServerSocialUserLink.IRequest
  const filterBody = {
    social_provider_id: socialLoginProviderId,
    limit: 10,
    offset: 0,
    order_by: "created_at desc",
    deleted_at_null: true,
  } satisfies IOauthServerSocialUserLink.IRequest;

  // 3. Call the patch API endpoint to search social user links by provider
  const searchResult: IPageIOauthServerSocialUserLink.ISummary =
    await api.functional.oauthServer.developer.socialLoginProviders.socialUserLinks.indexSocialUserLinksByProvider(
      connection,
      {
        socialLoginProviderId,
        body: filterBody,
      },
    );

  // 4. Validate the response structure and data
  typia.assert(searchResult);

  // Validate pagination properties
  TestValidator.predicate(
    "pagination current page non-negative",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    searchResult.pagination.pages >= 0,
  );

  // Validate that each social user link has matching social_provider_id
  for (const link of searchResult.data) {
    typia.assert(link);
    TestValidator.equals(
      "social provider id matches filter",
      link.social_provider_id,
      socialLoginProviderId,
    );
    // Also verify required properties are not null (id, user_id, external_user_id)
    TestValidator.predicate(
      "link has valid id",
      typeof link.id === "string" && link.id.length > 0,
    );
    TestValidator.predicate(
      "link has valid user_id",
      typeof link.user_id === "string" && link.user_id.length > 0,
    );
    TestValidator.predicate(
      "link has valid external_user_id",
      typeof link.external_user_id === "string" &&
        link.external_user_id.length > 0,
    );
  }

  // 5. Test access control by attempting the call as unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const unauthFilterBody = {
    social_provider_id: typia.random<string & tags.Format<"uuid">>(),
    limit: 10,
    offset: 0,
    order_by: "created_at desc",
    deleted_at_null: true,
  } satisfies IOauthServerSocialUserLink.IRequest;

  await TestValidator.error(
    "unauthenticated developer cannot access social user links",
    async () => {
      await api.functional.oauthServer.developer.socialLoginProviders.socialUserLinks.indexSocialUserLinksByProvider(
        unauthenticatedConnection,
        {
          socialLoginProviderId: unauthFilterBody.social_provider_id,
          body: unauthFilterBody,
        },
      );
    },
  );

  // 6. Edge case: filter with no matching records should return empty data array
  // Using a UUID unlikely to exist
  const noMatchProviderId = typia.random<string & tags.Format<"uuid">>();
  const noMatchResult =
    await api.functional.oauthServer.developer.socialLoginProviders.socialUserLinks.indexSocialUserLinksByProvider(
      connection,
      {
        socialLoginProviderId: noMatchProviderId,
        body: { ...filterBody, social_provider_id: noMatchProviderId },
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "empty data array for no matching provider",
    noMatchResult.data.length,
    0,
  );
}
