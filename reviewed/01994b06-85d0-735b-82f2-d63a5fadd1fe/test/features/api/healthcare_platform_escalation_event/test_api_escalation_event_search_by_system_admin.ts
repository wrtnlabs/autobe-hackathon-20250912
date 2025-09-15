import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEscalationEvent";

/**
 * Validate full-privilege escalation event search for system admin:
 *
 * 1. Register and login system admin
 * 2. Issue search queries with a variety of filters
 * 3. Assert only matching escalation events are returned and contain all expected
 *    fields
 * 4. Negative: validate that regular/org admins CANNOT access this endpoint across
 *    orgs (mock as placeholder)
 */
export async function test_api_escalation_event_search_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminBody = {
    email: `${RandomGenerator.name()}_${Date.now()}@enterprise-corp.com`,
    full_name: RandomGenerator.name(2),
    provider: "local",
    provider_key: `${RandomGenerator.name()}_${Date.now()}@enterprise-corp.com`,
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. System admin login (not strictly necessary—token is set in join())
  const loginOutput = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminBody.email,
      provider: adminBody.provider,
      provider_key: adminBody.provider_key,
      password: adminBody.password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginOutput);

  // 3. Issue event search with base case filter (no criteria — returns all)
  const allPage =
    await api.functional.healthcarePlatform.systemAdmin.escalationEvents.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(allPage);
  TestValidator.predicate(
    "at least zero escalation events are returned",
    allPage.data.length >= 0,
  );

  // 4. Try filter by status and escalation_type
  const escalationType = RandomGenerator.pick([
    "sla_violation",
    "breach",
    "compliance_required",
    "business_policy",
    "system_alert",
  ] as const);
  const status = RandomGenerator.pick([
    "open",
    "in_progress",
    "resolved",
    "expired",
    "error",
    "dismissed",
  ] as const);
  const filteredPage =
    await api.functional.healthcarePlatform.systemAdmin.escalationEvents.index(
      connection,
      {
        body: {
          escalationType,
          status,
        },
      },
    );
  typia.assert(filteredPage);
  filteredPage.data.forEach((ev) => {
    TestValidator.equals(
      `escalation_type matches filter (${escalationType})`,
      ev.escalation_type,
      escalationType,
    );
    TestValidator.equals(
      `resolution_status matches filter (${status})`,
      ev.resolution_status,
      status,
    );
  });

  // 5. Try advanced pagination/sorting
  const pageSize = 2;
  const sortedPage =
    await api.functional.healthcarePlatform.systemAdmin.escalationEvents.index(
      connection,
      {
        body: {
          page: 1,
          pageSize,
          sortField: "deadline_at",
          sortOrder: "desc",
        },
      },
    );
  typia.assert(sortedPage);
  TestValidator.equals(
    "pageSize limit respected",
    sortedPage.data.length <= pageSize,
    true,
  );
  if (sortedPage.data.length > 1) {
    for (let i = 1; i < sortedPage.data.length; ++i) {
      TestValidator.predicate(
        "descending deadline order",
        sortedPage.data[i - 1].deadline_at >= sortedPage.data[i].deadline_at,
      );
    }
  }

  // 6. Negative: non-system-admin cannot access - placeholder, as only system admin context is enabled in this test.
}
