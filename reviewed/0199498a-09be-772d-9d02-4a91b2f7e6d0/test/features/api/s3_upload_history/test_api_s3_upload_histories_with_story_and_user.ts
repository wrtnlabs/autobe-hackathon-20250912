import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiS3UploadHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiS3UploadHistory";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiS3UploadHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiS3UploadHistory";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate S3 upload history filtering by authenticated user and story IDs.
 *
 * 1. Register and login as a new system admin (store admin identifiers for login
 *    later).
 * 2. Register and login as an authenticated user.
 * 3. As the authenticated user, create a new story and upload an image to that
 *    story.
 * 4. As system admin (login), query the s3 upload history endpoint filtering by
 *    the authenticated user ID and/or story ID.
 * 5. Validate that the upload event appears in the history with correct linkage.
 * 6. Test various query params: only user, only story, both combined, pagination,
 *    and sorting.
 * 7. Test with irrelevant, deleted, or non-existent IDs (expect empty result or
 *    error).
 * 8. Without system admin login, confirm forbidden/unauthorized.
 * 9. Query with excessive or invalid filters and ensure proper error responses.
 */
export async function test_api_s3_upload_histories_with_story_and_user(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const sysAdminJoinReq = {
    external_admin_id: RandomGenerator.alphaNumeric(12),
    email: RandomGenerator.name(1) + "@testadmin.com",
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoinReq,
  });
  typia.assert(sysAdmin);

  // Save admin identifiers for re-login
  const adminLoginBody = {
    external_admin_id: sysAdmin.external_admin_id,
    email: sysAdmin.email,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;

  // Logout (simulate unauthenticated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Register & login as authenticated user
  const userJoinBody = {
    external_user_id: RandomGenerator.alphaNumeric(12),
    email: RandomGenerator.name(1) + "@authtest.com",
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  const authedUser = await api.functional.auth.authenticatedUser.join(
    connection,
    { body: userJoinBody },
  );
  typia.assert(authedUser);

  // Hold login payload for role switching
  const userLoginBody = {
    external_user_id: authedUser.external_user_id,
    email: authedUser.email,
  } satisfies IStoryfieldAiAuthenticatedUser.ILogin;

  // 3. Create a new story as authed user
  const storyBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    main_plot: RandomGenerator.paragraph(),
    language: "ko-KR",
  } satisfies IStoryfieldAiStory.ICreate;
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      { body: storyBody },
    );
  typia.assert(story);

  // 4. Upload image to the story as authed user
  const imageBody = {
    storyfield_ai_story_id: story.id,
    storyfield_ai_story_page_id: null,
    image_uri:
      "https://bucket.s3.amazonaws.com/path/to/image-" +
      RandomGenerator.alphaNumeric(10) +
      ".png",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IStoryfieldAiStoryImage.ICreate;
  const image =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.create(
      connection,
      {
        storyId: story.id,
        body: imageBody,
      },
    );
  typia.assert(image);

  // 5. Role switch: system admin login with original credentials
  await api.functional.auth.systemAdmin.login(connection, {
    body: adminLoginBody,
  });

  // 6. Patch query: filter by both user and story id
  const filterByBoth =
    await api.functional.storyfieldAi.systemAdmin.s3UploadHistories.index(
      connection,
      {
        body: {
          storyfield_ai_authenticateduser_id:
            story.storyfield_ai_authenticateduser_id,
          storyfield_ai_story_id: story.id,
        },
      },
    );
  typia.assert(filterByBoth);
  TestValidator.predicate(
    "upload event links to correct user + story",
    filterByBoth.data.some(
      (h) =>
        h.storyfield_ai_authenticateduser_id ===
          story.storyfield_ai_authenticateduser_id &&
        h.storyfield_ai_story_id === story.id,
    ),
  );

  // 7. Filter by user only
  const filterByUser =
    await api.functional.storyfieldAi.systemAdmin.s3UploadHistories.index(
      connection,
      {
        body: {
          storyfield_ai_authenticateduser_id:
            story.storyfield_ai_authenticateduser_id,
        },
      },
    );
  typia.assert(filterByUser);
  TestValidator.predicate(
    "history for user id includes the upload event",
    filterByUser.data.some(
      (h) =>
        h.storyfield_ai_authenticateduser_id ===
          story.storyfield_ai_authenticateduser_id &&
        h.storyfield_ai_story_id === story.id,
    ),
  );

  // 8. Filter by story only
  const filterByStoryOnly =
    await api.functional.storyfieldAi.systemAdmin.s3UploadHistories.index(
      connection,
      {
        body: {
          storyfield_ai_story_id: story.id,
        },
      },
    );
  typia.assert(filterByStoryOnly);
  TestValidator.predicate(
    "history for story id includes the upload event",
    filterByStoryOnly.data.some(
      (h) =>
        h.storyfield_ai_authenticateduser_id ===
          story.storyfield_ai_authenticateduser_id &&
        h.storyfield_ai_story_id === story.id,
    ),
  );

  // 9. Pagination/sorting: fetch with limit, verify paging contract
  const pageResp =
    await api.functional.storyfieldAi.systemAdmin.s3UploadHistories.index(
      connection,
      {
        body: {
          storyfield_ai_authenticateduser_id:
            story.storyfield_ai_authenticateduser_id,
          limit: 1,
          page: 1,
          sort_by: "created_at",
          sort_order: "desc",
        },
      },
    );
  typia.assert(pageResp);
  TestValidator.equals("page limit 1 enforced", pageResp.pagination.limit, 1);
  TestValidator.equals("page current is 1", pageResp.pagination.current, 1);
  TestValidator.equals(
    "at most 1 record returned",
    pageResp.data.length <= 1,
    true,
  );

  // 10. Non-existent user/story ids return empty
  const bogusId = typia.random<string & tags.Format<"uuid">>();
  const noneResult =
    await api.functional.storyfieldAi.systemAdmin.s3UploadHistories.index(
      connection,
      {
        body: {
          storyfield_ai_authenticateduser_id: bogusId,
          storyfield_ai_story_id: bogusId,
        },
      },
    );
  typia.assert(noneResult);
  TestValidator.equals("bogus filters return empty", noneResult.data.length, 0);

  // 11. Forbidden if not admin: try as blank/unauthenticated connection
  await TestValidator.error(
    "s3UploadHistories query requires admin auth",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.s3UploadHistories.index(
        unauthConn,
        {
          body: {
            storyfield_ai_authenticateduser_id:
              story.storyfield_ai_authenticateduser_id,
            storyfield_ai_story_id: story.id,
          },
        },
      );
    },
  );

  // 12. Excessive limits/invalid values result in error
  await TestValidator.error("excessive limit triggers error", async () => {
    await api.functional.storyfieldAi.systemAdmin.s3UploadHistories.index(
      connection,
      {
        body: {
          limit: 1000000,
        },
      },
    );
  });
}
