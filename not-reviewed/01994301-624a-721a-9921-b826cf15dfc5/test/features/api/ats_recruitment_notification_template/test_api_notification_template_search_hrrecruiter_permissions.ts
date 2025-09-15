import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationTemplate";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentNotificationTemplate";

/**
 * E2E test for HR recruiter notification template search with various
 * filter, search, and permission scenarios.
 *
 * 1. HR recruiter registration & authentication.
 * 2. List notification templates with default pagination (no filters).
 * 3. Paginate with page/limit options, verify metadata and that templates are
 *    for HR recruiter.
 * 4. Search by partial template_code substring (if results exist), verify all
 *    returned templates match code filter.
 * 5. Filter by channel (if available), verify all returned match channel.
 * 6. Filter by is_active true/false. Ensure returned templates match filter.
 * 7. Use a filter that yields 0 results, verify empty list and correct
 *    pagination.
 * 8. Try invalid filter (negative page or limit), verify error response is
 *    thrown.
 * 9. (RBAC) Check that HR recruiter cannot see templates outside their allowed
 *    scope (if such distinct templates exist).
 */
export async function test_api_notification_template_search_hrrecruiter_permissions(
  connection: api.IConnection,
) {
  // 1. HR Recruiter registration & auth
  const recruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      department: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiter);

  // 2. List all templates (default pagination, no filters)
  const page1 =
    await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "templates are summary objects",
    Array.isArray(page1.data) &&
      page1.data.every(
        (t) => typeof t.id === "string" && typeof t.template_code === "string",
      ),
  );
  TestValidator.predicate(
    "pagination structure exists",
    typeof page1.pagination === "object",
  );

  // 3. Paginate (page=2, limit=1)
  const paged =
    await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.index(
      connection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IAtsRecruitmentNotificationTemplate.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.equals(
    "pagination current page is 2",
    paged.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit is 1", paged.pagination.limit, 1);

  // 4. Search by template_code (if at least one exists)
  if (page1.data.length > 0) {
    const codeSubstr = page1.data[0].template_code.substring(
      0,
      Math.max(2, Math.floor(page1.data[0].template_code.length / 2)),
    );
    const filtered =
      await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.index(
        connection,
        {
          body: {
            template_code: codeSubstr,
          } satisfies IAtsRecruitmentNotificationTemplate.IRequest,
        },
      );
    typia.assert(filtered);
    TestValidator.predicate(
      "all filtered templates match code substring",
      filtered.data.every((t) => t.template_code.includes(codeSubstr)),
    );
  }

  // 5. Filter by channel (if available)
  const channels = [...new Set(page1.data.map((t) => t.channel))];
  if (channels.length > 0) {
    const channelToFilter = channels[0];
    const byChannel =
      await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.index(
        connection,
        {
          body: {
            channel: channelToFilter,
          } satisfies IAtsRecruitmentNotificationTemplate.IRequest,
        },
      );
    typia.assert(byChannel);
    TestValidator.predicate(
      "all filtered templates match channel",
      byChannel.data.every((t) => t.channel === channelToFilter),
    );
  }

  // 6. Filter by is_active true/false, if both true/false exist
  const hasActive = page1.data.some((t) => t.is_active === true);
  const hasInactive = page1.data.some((t) => t.is_active === false);
  if (hasActive) {
    const activeFiltered =
      await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.index(
        connection,
        {
          body: {
            is_active: true,
          } satisfies IAtsRecruitmentNotificationTemplate.IRequest,
        },
      );
    typia.assert(activeFiltered);
    TestValidator.predicate(
      "all templates are active",
      activeFiltered.data.every((t) => t.is_active === true),
    );
  }
  if (hasInactive) {
    const inactiveFiltered =
      await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.index(
        connection,
        {
          body: {
            is_active: false,
          } satisfies IAtsRecruitmentNotificationTemplate.IRequest,
        },
      );
    typia.assert(inactiveFiltered);
    TestValidator.predicate(
      "all templates are inactive",
      inactiveFiltered.data.every((t) => t.is_active === false),
    );
  }

  // 7. Filter that yields 0 results (likely random code)
  const none =
    await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.index(
      connection,
      {
        body: {
          template_code: RandomGenerator.alphaNumeric(32),
        } satisfies IAtsRecruitmentNotificationTemplate.IRequest,
      },
    );
  typia.assert(none);
  TestValidator.equals("empty results if filter yields 0", none.data.length, 0);

  // 8. Invalid filter: negative page/limit
  await TestValidator.error("negative page causes error", async () => {
    await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.index(
      connection,
      {
        body: {
          page: -1,
        } satisfies IAtsRecruitmentNotificationTemplate.IRequest,
      },
    );
  });
  await TestValidator.error("negative limit causes error", async () => {
    await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.index(
      connection,
      {
        body: {
          limit: -5,
        } satisfies IAtsRecruitmentNotificationTemplate.IRequest,
      },
    );
  });

  // 9. RBAC check: can't view out-of-scope templates (if possible)
  // This setup may not be possible without explicit forbidden templates, but try unreasonable filter
  await TestValidator.error(
    "forbidden channel template search should fail (RBAC)",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.index(
        connection,
        {
          body: {
            channel: "superuser_only_channel",
          } satisfies IAtsRecruitmentNotificationTemplate.IRequest,
        },
      );
    },
  );
}
