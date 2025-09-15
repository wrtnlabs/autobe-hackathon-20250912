import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsBlendedLearningSession";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsBlendedLearningSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsBlendedLearningSession";

export async function test_api_blended_learning_sessions_search_by_guest(
  connection: api.IConnection,
) {
  // 1. Create and authenticate guest user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const guestCreateBody = {
    tenant_id: tenantId,
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  const guestAuthenticated: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestCreateBody,
    });
  typia.assert(guestAuthenticated);

  // 2. Compose several search filter bodies for the blendedLearningSessions endpoint
  // Valid random filters
  const validRequestBodies: IEnterpriseLmsBlendedLearningSession.IRequest[] = [
    {
      page: 1,
      limit: 10,
      order_by: "scheduled_start_at",
    },
    {
      session_type: "online",
      status: "scheduled",
      page: 1,
      limit: 5,
    },
    {
      title: "Intro",
      page: 2,
      limit: 3,
    },
    {
      scheduled_start_at_from: new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      scheduled_end_at_to: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      page: 1,
      limit: 20,
    },
  ];

  // Test 3 different valid requests
  for (const requestBody of validRequestBodies) {
    const response: IPageIEnterpriseLmsBlendedLearningSession.ISummary =
      await api.functional.enterpriseLms.guest.blendedLearningSessions.index(
        connection,
        {
          body: requestBody,
        },
      );
    typia.assert(response);

    TestValidator.predicate(
      `Pagination current page ${requestBody.page ?? 1}`,
      response.pagination.current === (requestBody.page ?? 1),
    );
    TestValidator.predicate(
      `Pagination limit ${requestBody.limit ?? 0}`,
      response.pagination.limit === (requestBody.limit ?? 0),
    );
    for (const sessionSummary of response.data) {
      typia.assert(sessionSummary);
      // Optionally validate filter conditions when applicable
      if (requestBody.status !== undefined) {
        TestValidator.equals(
          `Session status matches filter`,
          sessionSummary.status,
          requestBody.status,
        );
      }
      if (requestBody.title !== undefined) {
        TestValidator.predicate(
          `Session title includes filter`,
          sessionSummary.title.includes(requestBody.title),
        );
      }
      if (requestBody.scheduled_start_at_from !== undefined) {
        TestValidator.predicate(
          `Session start date >= scheduled_start_at_from`,
          new Date(sessionSummary.scheduled_start_at) >=
            new Date(requestBody.scheduled_start_at_from!),
        );
      }
      if (requestBody.scheduled_end_at_to !== undefined) {
        TestValidator.predicate(
          `Session start date <= scheduled_end_at_to`,
          new Date(sessionSummary.scheduled_start_at) <=
            new Date(requestBody.scheduled_end_at_to!),
        );
      }
    }
  }

  // 3. Test boundary: Empty results
  const emptyResponse: IPageIEnterpriseLmsBlendedLearningSession.ISummary =
    await api.functional.enterpriseLms.guest.blendedLearningSessions.index(
      connection,
      {
        body: {
          title: "this-title-should-not-exist-1234567890",
          page: 1,
          limit: 10,
        } satisfies IEnterpriseLmsBlendedLearningSession.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals("Empty data array", emptyResponse.data.length, 0);

  // 4. Test maximum page size
  const maxLimit: number = 100;
  const maxPageSizeRequest: IEnterpriseLmsBlendedLearningSession.IRequest = {
    page: 1,
    limit: maxLimit,
  };
  const maxPageSizeResponse: IPageIEnterpriseLmsBlendedLearningSession.ISummary =
    await api.functional.enterpriseLms.guest.blendedLearningSessions.index(
      connection,
      {
        body: maxPageSizeRequest,
      },
    );
  typia.assert(maxPageSizeResponse);
  TestValidator.predicate(
    `Page limit not exceeding ${maxLimit}`,
    maxPageSizeResponse.pagination.limit <= maxLimit,
  );

  // 5. Tenant data isolation check
  // Tenant_id should be the same as the guest user's tenant in all session summaries
  // Note: ISummary does not contain tenant_id, so we cannot validate tenant isolation here

  // 6. Error handling for unauthorized requests
  // Cannot directly test missing / invalid JWT with SDK - tokens are managed internally
  // But can try to simulate unauthorized by creating disconnected connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("Unauthorized request should fail", async () => {
    await api.functional.enterpriseLms.guest.blendedLearningSessions.index(
      unauthenticatedConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEnterpriseLmsBlendedLearningSession.IRequest,
      },
    );
  });
}
