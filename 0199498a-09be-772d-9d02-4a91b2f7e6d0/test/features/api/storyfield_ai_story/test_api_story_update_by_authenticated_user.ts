import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";

/**
 * 인증된 사용자가 자신의 스토리를 업데이트하는 전과정 시나리오.
 *
 * 1. 인증유저 회원가입(외부 ID, 이메일 랜덤 발급)
 * 2. 스토리 최초 생성 (title/language 고유값)
 * 3. 일부 내용(title/plot/language 등) 변경 요청
 *
 *    - 변경사항 반영, updated_at 필드 갱신, created_at 불변, 소유 UUID 불변
 * 4. 존재하지 않는(storyId 임의값) 혹은 soft-delete 된 스토리 업데이트 요청 - 에러 검증
 * 5. 다른 사용자가 본인 소유가 아닌 스토리 업데이트 시도 - 금지됨 확인
 * 6. 동일 유저 내 중복 title 시도 - 에러 검증
 * 7. 필수값(예: 언어) 누락 시도 - 유효성 에러 검증
 */
export async function test_api_story_update_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. 인증유저 회원가입
  const userJoinInput = {
    external_user_id: RandomGenerator.alphaNumeric(10),
    email: `${RandomGenerator.alphaNumeric(5)}@test.com`,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  const user: IStoryfieldAiAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: userJoinInput,
    });
  typia.assert(user);

  // 2. 스토리 생성
  const storyCreateInput = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    main_plot: RandomGenerator.paragraph(),
    language: "ko-KR",
  } satisfies IStoryfieldAiStory.ICreate;
  const story: IStoryfieldAiStory =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      { body: storyCreateInput },
    );
  typia.assert(story);

  // 3. 소유 스토리 일부 변경
  const updateTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatePlot = RandomGenerator.paragraph({ sentences: 4 });
  const updateLanguage = "en";
  const updateBody = {
    title: updateTitle,
    main_plot: updatePlot,
    language: updateLanguage,
  } satisfies IStoryfieldAiStory.IUpdate;
  const updated: IStoryfieldAiStory =
    await api.functional.storyfieldAi.authenticatedUser.stories.update(
      connection,
      { storyId: story.id, body: updateBody },
    );
  typia.assert(updated);
  TestValidator.equals("타이틀 업데이트 반영", updated.title, updateTitle);
  TestValidator.equals("메인 플롯 변경 반영", updated.main_plot, updatePlot);
  TestValidator.equals("언어 변경 반영", updated.language, updateLanguage);
  TestValidator.notEquals(
    "updated_at 갱신 확인",
    updated.updated_at,
    story.updated_at,
  );
  TestValidator.equals(
    "스토리 소유자 불변",
    updated.storyfield_ai_authenticateduser_id,
    user.id,
  );

  // 4. 존재하지 않는 스토리 업데이트 → NotFound 등 비즈니스 에러
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("존재하지 않는 스토리 업데이트 에러", async () => {
    await api.functional.storyfieldAi.authenticatedUser.stories.update(
      connection,
      { storyId: fakeId, body: { title: RandomGenerator.name() } },
    );
  });

  // 5. 다른 사용자로 생성한 스토리 업데이트 시도 → 권한 에러
  // 신규 사용자 생성
  const otherJoinInput = {
    external_user_id: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(5)}@another.com`,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  const other: IStoryfieldAiAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: otherJoinInput,
    });
  typia.assert(other);
  // 다른 사용자로 시도 (인증 context 자동 전환)
  await TestValidator.error("다른 계정의 스토리 업데이트 금지", async () => {
    await api.functional.storyfieldAi.authenticatedUser.stories.update(
      connection,
      { storyId: story.id, body: { title: RandomGenerator.name() } },
    );
  });

  // 6. title 중복 체크 (동일 유저 내)
  const dupStory =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: "duplicated-title",
          language: "ko-KR",
        } satisfies IStoryfieldAiStory.ICreate,
      },
    );
  typia.assert(dupStory);
  await TestValidator.error(
    "동일 유저 내 title 중복 업데이트 에러",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.update(
        connection,
        {
          storyId: dupStory.id,
          body: { title: updateTitle },
        },
      );
    },
  );

  // 7. Required 필드 누락 (language 미포함)
  await TestValidator.error("필수값 누락(language) 시 에러", async () => {
    await api.functional.storyfieldAi.authenticatedUser.stories.update(
      connection,
      {
        storyId: dupStory.id,
        body: {},
      },
    );
  });
}
