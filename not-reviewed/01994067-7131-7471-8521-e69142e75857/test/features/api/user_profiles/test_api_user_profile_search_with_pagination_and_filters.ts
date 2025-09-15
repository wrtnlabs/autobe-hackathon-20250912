import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerMember";
import type { IOauthServerUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserProfiles";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerUserProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerUserProfiles";

export async function test_api_user_profile_search_with_pagination_and_filters(
  connection: api.IConnection,
) {
  // 1. Member registration - create a new member user
  const memberCreationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IOauthServerMember.ICreate;
  const memberCreated: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreationBody,
    });
  typia.assert(memberCreated);

  // 2. Member login - authenticate with created member
  const loginBody = {
    email: memberCreationBody.email,
    password: memberCreationBody.password,
  } satisfies IOauthServerMember.ILogin;
  const memberLoggedIn: IOauthServerMember.IAuthorized =
    await api.functional.auth.member.login(connection, { body: loginBody });
  typia.assert(memberLoggedIn);

  // 3. Search user profiles without filters - defaults pagination
  const searchAllBody = {
    page: 1,
    limit: 10,
    nickname: null,
    user_id: null,
  } satisfies IOauthServerUserProfiles.IRequest;

  const searchAllResult: IPageIOauthServerUserProfiles.ISummary =
    await api.functional.oauthServer.member.userProfiles.index(connection, {
      body: searchAllBody,
    });
  typia.assert(searchAllResult);

  // Validate the pagination defaults and result integrity
  TestValidator.predicate(
    "pagination current page is 1 or more",
    searchAllResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is 1 or more",
    searchAllResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records is 0 or more",
    searchAllResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is 0 or more",
    searchAllResult.pagination.pages >= 0,
  );
  TestValidator.equals(
    "data array length should be less than or equal to limit",
    searchAllResult.data.length <= searchAllResult.pagination.limit,
    true,
  );

  // 4. Search user profiles filtering by nickname (if any nickname exists in data)
  if (searchAllResult.data.length > 0) {
    const sampleProfile = searchAllResult.data[0];
    const nicknameFragment = sampleProfile.nickname
      ? sampleProfile.nickname.substring(
          0,
          Math.min(3, sampleProfile.nickname.length),
        )
      : null;

    if (nicknameFragment) {
      const filteredByNicknameBody = {
        page: 1,
        limit: 10,
        nickname: nicknameFragment,
        user_id: null,
      } satisfies IOauthServerUserProfiles.IRequest;

      const filteredResult: IPageIOauthServerUserProfiles.ISummary =
        await api.functional.oauthServer.member.userProfiles.index(connection, {
          body: filteredByNicknameBody,
        });
      typia.assert(filteredResult);

      // Validate all returned items contain the nickname fragment
      for (const profile of filteredResult.data) {
        TestValidator.predicate(
          `profile nickname contains '${nicknameFragment}'`,
          profile.nickname !== null &&
            profile.nickname !== undefined &&
            profile.nickname.includes(nicknameFragment),
        );
      }
    }
  }

  // 5. Test pagination: requesting a specific page and limit
  const paginationTestBody = {
    page: 1,
    limit: 5,
    nickname: null,
    user_id: null,
  } satisfies IOauthServerUserProfiles.IRequest;

  const paginationResult: IPageIOauthServerUserProfiles.ISummary =
    await api.functional.oauthServer.member.userProfiles.index(connection, {
      body: paginationTestBody,
    });
  typia.assert(paginationResult);

  TestValidator.predicate(
    "pagination limit respected",
    paginationResult.data.length <= paginationTestBody.limit,
  );

  // 6. If created member has user profile, filter by user_id
  const userIdToFilter = memberCreated.id;

  const filterByUserIdBody = {
    page: 1,
    limit: 10,
    nickname: null,
    user_id: userIdToFilter satisfies string & tags.Format<"uuid">,
  } satisfies IOauthServerUserProfiles.IRequest;

  const filterByUserIdResult: IPageIOauthServerUserProfiles.ISummary =
    await api.functional.oauthServer.member.userProfiles.index(connection, {
      body: filterByUserIdBody,
    });
  typia.assert(filterByUserIdResult);

  for (const profile of filterByUserIdResult.data) {
    TestValidator.equals(
      "profile user_id matches filter",
      profile.user_id,
      userIdToFilter,
    );
  }

  // 7. Boundary test: filter criteria yielding no results
  const noResultBody = {
    page: 1,
    limit: 10,
    nickname: "nonexistingnickname12345",
    user_id: null,
  } satisfies IOauthServerUserProfiles.IRequest;

  const noResult: IPageIOauthServerUserProfiles.ISummary =
    await api.functional.oauthServer.member.userProfiles.index(connection, {
      body: noResultBody,
    });
  typia.assert(noResult);

  TestValidator.equals(
    "empty data array for no matching nickname",
    noResult.data.length,
    0,
  );

  // 8. Boundary test: page number beyond last page
  const beyondPageBody = {
    page: noResult.pagination.pages + 10,
    limit: 10,
    nickname: null,
    user_id: null,
  } satisfies IOauthServerUserProfiles.IRequest;

  // Make the request only if pages information is available and positive
  if (noResult.pagination.pages >= 1) {
    const beyondPageResult: IPageIOauthServerUserProfiles.ISummary =
      await api.functional.oauthServer.member.userProfiles.index(connection, {
        body: beyondPageBody,
      });
    typia.assert(beyondPageResult);

    TestValidator.equals(
      "empty data array when requesting page beyond total pages",
      beyondPageResult.data.length,
      0,
    );
  }
}
