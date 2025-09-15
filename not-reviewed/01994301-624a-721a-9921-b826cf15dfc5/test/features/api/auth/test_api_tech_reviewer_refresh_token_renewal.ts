import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate technical reviewer refresh token renewal business rules and edge
 * cases.
 *
 * 1. Register a new technical reviewer (join)
 * 2. Log in as the reviewer to get the initial access and refresh tokens
 * 3. Use the valid refresh token to renew tokens - expect success, new tokens, and
 *    correct profile
 * 4. Attempt refresh with tampered token - expect error
 * 5. Attempt refresh with another reviewer's token to simulate
 *    deactivation/cross-user use - expect error
 * 6. Attempt refresh with an obviously invalid/expired token - expect error
 */
export async function test_api_tech_reviewer_refresh_token_renewal(
  connection: api.IConnection,
) {
  // 1. Register a new technical reviewer
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email: reviewerEmail,
    password: reviewerPassword,
    name: RandomGenerator.name(),
    specialization: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IAtsRecruitmentTechReviewer.ICreate;
  const joinResp = await api.functional.auth.techReviewer.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResp);

  // 2. Login to get tokens
  const loginResp = await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });
  typia.assert(loginResp);

  // 3. Refresh using the valid refresh token
  const validRefreshToken = loginResp.token.refresh;
  const refreshResp = await api.functional.auth.techReviewer.refresh(
    connection,
    {
      body: {
        refresh_token: validRefreshToken,
      } satisfies IAtsRecruitmentTechReviewer.IRefresh,
    },
  );
  typia.assert(refreshResp);
  // Ensure the response matches expectations:
  TestValidator.equals(
    "email remains same after refresh",
    refreshResp.email,
    reviewerEmail,
  );
  TestValidator.equals(
    "account remains active after refresh",
    refreshResp.is_active,
    true,
  );
  TestValidator.notEquals(
    "renewed refresh token is different",
    refreshResp.token.refresh,
    validRefreshToken,
  );
  // If specialization present, it should stay the same
  if (
    joinBody.specialization !== null &&
    joinBody.specialization !== undefined
  ) {
    TestValidator.equals(
      "specialization persists after refresh",
      refreshResp.specialization,
      joinBody.specialization,
    );
  }

  // 4. Tampered/invalid refresh token (simulate by altering token string)
  const tamperedToken = validRefreshToken + "tamper";
  await TestValidator.error("refresh token fails if tampered", async () => {
    await api.functional.auth.techReviewer.refresh(connection, {
      body: {
        refresh_token: tamperedToken,
      } satisfies IAtsRecruitmentTechReviewer.IRefresh,
    });
  });

  // 5. Use a different reviewer's token to simulate deactivation / improper token usage (since actual deactivation not available)
  const otherReviewerEmail = typia.random<string & tags.Format<"email">>();
  const otherReviewerPassword = RandomGenerator.alphaNumeric(12);
  const otherJoinResp = await api.functional.auth.techReviewer.join(
    connection,
    {
      body: {
        email: otherReviewerEmail,
        password: otherReviewerPassword,
        name: RandomGenerator.name(),
      } satisfies IAtsRecruitmentTechReviewer.ICreate,
    },
  );
  typia.assert(otherJoinResp);
  await TestValidator.error(
    "refresh with another reviewer's refresh_token is rejected",
    async () => {
      await api.functional.auth.techReviewer.refresh(connection, {
        body: {
          refresh_token: otherJoinResp.token.refresh,
        } satisfies IAtsRecruitmentTechReviewer.IRefresh,
      });
    },
  );

  // 6. Simulate expired/invalid token - use an obviously invalid string
  await TestValidator.error(
    "refresh token fails when expired/obviously invalid",
    async () => {
      await api.functional.auth.techReviewer.refresh(connection, {
        body: {
          refresh_token: "expired.invalid.token",
        } satisfies IAtsRecruitmentTechReviewer.IRefresh,
      });
    },
  );
}
