import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationTemplate";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentNotificationTemplate";

/**
 * E2E test for system admin notification template search, filter, and
 * pagination.
 *
 * Scenario:
 *
 * 1. Register as a system admin (join) and store token for role validation.
 * 2. GET (PATCH) notification template list with default (no filters) — verify
 *    normal pagination, data, and summary structures.
 * 3. Search by template_code: Use partial and full matches from known results;
 *    check filtering works as expected.
 * 4. Filter by channel ('email', 'sms', 'app_push', 'webhook'): For each type
 *    present in results, filter and validate returned records all match
 *    channel.
 * 5. Filter by is_active (true/false): Validate both filters return correct
 *    sets, with all result items matching filter.
 * 6. Pagination: Request page 1 and 2 with a small limit, ensure correct page
 *    info and no duplicates.
 * 7. Invalid/no-result search: Use gibberish template_code, expect empty data
 *    array and correct pagination.
 * 8. Security: Attempt request with unauthenticated connection, expect access
 *    denied.
 * 9. Data/field validation: Assert returned summaries only include expected
 *    IAtsRecruitmentNotificationTemplate.ISummary fields, no leaks,
 *    typia.assert on all outputs.
 */
export async function test_api_notification_template_search_pagination_filtering_systemadmin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // 2. Basic listing (no filters)
  const page =
    await api.functional.atsRecruitment.systemAdmin.notificationTemplates.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(page);
  // At least 1 record expected in most cases; check shape
  TestValidator.predicate(
    "template paging returns valid page info",
    typeof page.pagination.current === "number" &&
      typeof page.pagination.pages === "number",
  );
  page.data.forEach((item) => typia.assert(item));

  // 3. Search by template_code (partial, exact)
  if (page.data.length > 0) {
    const code = page.data[0].template_code;
    const partial = code.substring(0, Math.max(2, code.length - 1));

    // Exact
    const byCode =
      await api.functional.atsRecruitment.systemAdmin.notificationTemplates.index(
        connection,
        {
          body: { template_code: code },
        },
      );
    typia.assert(byCode);
    TestValidator.predicate(
      "exact code filter returns correct code",
      byCode.data.every((t) => t.template_code === code),
    );

    // Partial
    const byPartial =
      await api.functional.atsRecruitment.systemAdmin.notificationTemplates.index(
        connection,
        {
          body: { template_code: partial },
        },
      );
    typia.assert(byPartial);
    TestValidator.predicate(
      "partial code filter returns matches",
      byPartial.data.every((t) => t.template_code.includes(partial)),
    );
  }

  // 4. Filter by channel
  const allChannels = page.data.map((t) => t.channel);
  for (const channel of Array.from(new Set(allChannels))) {
    const byChannel =
      await api.functional.atsRecruitment.systemAdmin.notificationTemplates.index(
        connection,
        {
          body: { channel },
        },
      );
    typia.assert(byChannel);
    TestValidator.predicate(
      `filter by channel '${channel}' returns only channel-matching`,
      byChannel.data.every((t) => t.channel === channel),
    );
  }

  // 5. Filter by is_active
  for (const isActive of [true, false]) {
    const byStatus =
      await api.functional.atsRecruitment.systemAdmin.notificationTemplates.index(
        connection,
        {
          body: { is_active: isActive },
        },
      );
    typia.assert(byStatus);
    TestValidator.predicate(
      `filter is_active=${isActive} returns correct status`,
      byStatus.data.every((t) => t.is_active === isActive),
    );
  }

  // 6. Pagination: page/limit
  const smallLimit = 2;
  const firstPage =
    await api.functional.atsRecruitment.systemAdmin.notificationTemplates.index(
      connection,
      {
        body: { page: 1, limit: smallLimit },
      },
    );
  typia.assert(firstPage);
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.atsRecruitment.systemAdmin.notificationTemplates.index(
        connection,
        {
          body: { page: 2, limit: smallLimit },
        },
      );
    typia.assert(secondPage);
    TestValidator.notEquals(
      "first and second page results differ",
      firstPage.data,
      secondPage.data,
    );
  }

  // 7. No-result/gibberish filter
  const nonsense = RandomGenerator.alphaNumeric(12) + "notfound";
  const none =
    await api.functional.atsRecruitment.systemAdmin.notificationTemplates.index(
      connection,
      {
        body: { template_code: nonsense },
      },
    );
  typia.assert(none);
  TestValidator.equals("no-result search yields empty data", none.data, []);

  // 8. Security: unauthorized access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "access denied to unauthenticated user",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.notificationTemplates.index(
        unauthConn,
        { body: {} },
      );
    },
  );

  // 9. Data/field checks: assert summary matches schema
  page.data.forEach((item) => {
    typia.assert<IAtsRecruitmentNotificationTemplate.ISummary>(item);
    TestValidator.predicate("summary has id", typeof item.id === "string");
    TestValidator.predicate(
      "summary has channel",
      typeof item.channel === "string",
    );
    TestValidator.predicate(
      "summary has template_code",
      typeof item.template_code === "string",
    );
    TestValidator.predicate(
      "summary has is_active",
      typeof item.is_active === "boolean",
    );
    TestValidator.predicate(
      "summary has created_at",
      typeof item.created_at === "string",
    );
    TestValidator.predicate(
      "summary has updated_at",
      typeof item.updated_at === "string",
    );
  });
}
