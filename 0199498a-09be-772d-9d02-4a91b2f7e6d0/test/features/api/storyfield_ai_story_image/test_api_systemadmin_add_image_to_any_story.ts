import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * 시스템 관리자가 임의의 스토리에 이미지를 추가할 수 있는지, 권한 및 예외 처리가 적절히 동작하는지 검증하는 E2E 테스트입니다.
 *
 * 1. 인증된 사용자를 온보딩 및 로그인
 * 2. 해당 유저로 스토리 생성(원 저자)
 * 3. 시스템 관리자를 온보딩 및 로그인 후 권한 전환
 * 4. 시스템 관리자 권한으로 위 스토리에 이미지를 등록하고 응답 데이터 유효성 검증
 * 5. 존재하지 않는 스토리 id로 이미지를 등록하려 했을 때 에러 발생 검증
 */
export async function test_api_systemadmin_add_image_to_any_story(
  connection: api.IConnection,
) {
  // 1. 인증 사용자 가입 및 로그인
  const authenticatedUserExternalId = RandomGenerator.alphaNumeric(12);
  const authenticatedUserEmail = `${RandomGenerator.name(1)}@authed.test`;
  const authedJoin = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: authenticatedUserExternalId,
        email: authenticatedUserEmail,
        actor_type: "authenticatedUser",
      },
    },
  );
  typia.assert(authedJoin);

  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: authenticatedUserExternalId,
      email: authenticatedUserEmail,
    },
  });

  // 2. 인증 사용자로 스토리 생성
  const storyCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    main_plot: RandomGenerator.paragraph({ sentences: 5 }),
    language: RandomGenerator.pick(["ko", "en", "경상도"] as const),
  } satisfies IStoryfieldAiStory.ICreate;
  const createdStory =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: storyCreateBody,
      },
    );
  typia.assert(createdStory);

  // 3. 시스템 관리자 가입 및 로그인
  const adminExternalId = RandomGenerator.alphaNumeric(12);
  const adminEmail = `${RandomGenerator.name(1)}@admin.autobe.test`;
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
      actor_type: "systemAdmin",
    },
  });
  typia.assert(adminJoin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
    },
  });

  // 4. 시스템 관리자 권한으로 임의 스토리에 이미지 등록
  const imageUri = `https://test-imgs.autobe.ai/${RandomGenerator.alphaNumeric(10)}.png`;
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const imageRequestBody = {
    storyfield_ai_story_id: createdStory.id,
    image_uri: imageUri,
    description: description,
  } satisfies IStoryfieldAiStoryImage.ICreate;
  const createdImage =
    await api.functional.storyfieldAi.systemAdmin.stories.images.create(
      connection,
      {
        storyId: createdStory.id,
        body: imageRequestBody,
      },
    );
  typia.assert(createdImage);
  // 필수 business-field 검증
  TestValidator.equals(
    "이미지와 스토리 연결 확인",
    createdImage.storyfield_ai_story_id,
    createdStory.id,
  );
  TestValidator.equals("image_uri matches", createdImage.image_uri, imageUri);
  TestValidator.equals(
    "description matches",
    createdImage.description,
    description,
  );

  // 5. 존재하지 않는 스토리 id로 이미지 추가 시도 -> 에러 발생 확인
  const nonExistStoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "존재하지 않는 스토리 id로 이미지 등록 시 에러 발생",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.stories.images.create(
        connection,
        {
          storyId: nonExistStoryId,
          body: {
            storyfield_ai_story_id: nonExistStoryId,
            image_uri: `https://test-imgs.autobe.ai/${RandomGenerator.alphaNumeric(10)}.png`,
            description: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    },
  );
}
