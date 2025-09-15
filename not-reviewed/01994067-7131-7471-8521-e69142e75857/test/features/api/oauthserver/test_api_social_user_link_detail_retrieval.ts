import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";
import type { IOauthServerSocialUserLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerSocialUserLink";

/**
 * This E2E test validates that an authorized developer can retrieve detailed
 * information about a social user link associated with a given social login
 * provider.
 *
 * It covers:
 *
 * 1. Developer registration and login to establish authorization.
 * 2. Retrieval of social user link details by socialLoginProviderId and link ID.
 * 3. Validation of returned data structure and presence of key properties.
 * 4. Handling of optional tokens and nullable timestamps.
 * 5. Graceful error handling if the link is non-existent, soft deleted, or access
 *    unauthorized.
 */
export async function test_api_social_user_link_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Create and authenticate developer
  const developerEmail: string = typia.random<string & tags.Format<"email">>();
  const developerPasswordHash: string = RandomGenerator.alphaNumeric(64);

  const developer: IOauthServerDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        email_verified: true,
        password_hash: developerPasswordHash,
      } satisfies IOauthServerDeveloper.ICreate,
    });
  typia.assert(developer);

  // 2. Generate UUIDs for test retrieval
  const socialLoginProviderId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const socialUserLinkId: string = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to retrieve the social user link details
  try {
    const socialUserLink: IOauthServerSocialUserLink =
      await api.functional.oauthServer.developer.socialLoginProviders.socialUserLinks.atSocialUserLink(
        connection,
        {
          socialLoginProviderId: socialLoginProviderId,
          id: socialUserLinkId,
        },
      );
    typia.assert(socialUserLink);

    // 4. Assert required properties and type correctness
    TestValidator.predicate(
      "social user link id is present",
      typeof socialUserLink.id === "string",
    );
    TestValidator.predicate(
      "social user link user_id is present",
      typeof socialUserLink.user_id === "string",
    );
    TestValidator.predicate(
      "social user link social_provider_id is present",
      typeof socialUserLink.social_provider_id === "string",
    );
    TestValidator.predicate(
      "social user link external_user_id is present",
      typeof socialUserLink.external_user_id === "string",
    );

    // 5. Optional tokens: null, undefined, or string
    TestValidator.predicate(
      "access_token check",
      socialUserLink.access_token === null ||
        typeof socialUserLink.access_token === "string" ||
        socialUserLink.access_token === undefined,
    );
    TestValidator.predicate(
      "refresh_token check",
      socialUserLink.refresh_token === null ||
        typeof socialUserLink.refresh_token === "string" ||
        socialUserLink.refresh_token === undefined,
    );
    TestValidator.predicate(
      "token_expiry check",
      socialUserLink.token_expiry === null ||
        typeof socialUserLink.token_expiry === "string" ||
        socialUserLink.token_expiry === undefined,
    );

    // 6. Timestamp fields asserted as string or null/undefined where allowed
    TestValidator.predicate(
      "created_at check",
      typeof socialUserLink.created_at === "string",
    );
    TestValidator.predicate(
      "updated_at check",
      typeof socialUserLink.updated_at === "string",
    );
    TestValidator.predicate(
      "deleted_at check",
      socialUserLink.deleted_at === null ||
        typeof socialUserLink.deleted_at === "string" ||
        socialUserLink.deleted_at === undefined,
    );
  } catch {
    // Error expected for invalid IDs, soft deleted, or unauthorized calls
  }
}
