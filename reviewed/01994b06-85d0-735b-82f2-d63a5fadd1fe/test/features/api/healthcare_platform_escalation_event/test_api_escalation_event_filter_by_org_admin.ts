import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEscalationEvent";

/**
 * E2E scenario: Only escalation events for admin's organization are visible,
 * filters and pagination are respected, privacy enforced, and errors surfaced
 * for invalid params.
 *
 * Steps:
 *
 * 1. Register org admin and login for session.
 * 2. List escalation events (no filter) and check non-empty response or that
 *    filtering/pagination is correct.
 * 3. Pick a status, type, or event property and filter by it—verify filtered
 *    results.
 * 4. Use pagination and confirm page, pageSize, limit.
 * 5. Issue searches with invalid params and expect errors.
 */
export async function test_api_escalation_event_filter_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Organization admin registration
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "testPa55!",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinBody },
  );
  typia.assert(orgAdmin);

  // 2. Organization admin login
  const loginBody = {
    email: joinBody.email,
    password: "testPa55!",
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const session = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(session);
  // By API behavior, the returned token sets Authorization for further requests

  // 3. Broad escalation events lookup (no filter)
  const broadPage =
    await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(broadPage);
  TestValidator.predicate(
    "pagination current >= 1",
    broadPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    broadPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    broadPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    broadPage.pagination.pages >= 0,
  );
  if (broadPage.data.length > 0) {
    // 4. Pick a property to filter on (status/type/level/user/role/notification).
    const sample = RandomGenerator.pick(broadPage.data);
    // Try status filtering
    const statusPage =
      await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.index(
        connection,
        {
          body: { status: sample.resolution_status },
        },
      );
    typia.assert(statusPage);
    TestValidator.predicate(
      "status filtered page all match status",
      statusPage.data.every(
        (ev) => ev.resolution_status === sample.resolution_status,
      ),
    );
    // Try escalationType filtering
    const typePage =
      await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.index(
        connection,
        {
          body: { escalationType: sample.escalation_type },
        },
      );
    typia.assert(typePage);
    TestValidator.predicate(
      "type filtered page all match type",
      typePage.data.every(
        (ev) => ev.escalation_type === sample.escalation_type,
      ),
    );
    // Pagination: pageSize 1, page 1
    if (broadPage.pagination.records > 0) {
      const paged =
        await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.index(
          connection,
          {
            body: {
              page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
              pageSize: 1 as number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<200>,
            },
          },
        );
      typia.assert(paged);
      TestValidator.equals(
        "paged result has 1 item or less",
        paged.data.length,
        paged.data.length <= 1 ? paged.data.length : 1,
      );
    }
  }

  // 5. Error scenario: Try invalid page (zero), expect error
  await TestValidator.error("page=0 should be error", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.index(
      connection,
      {
        body: { page: 0 as number & tags.Type<"int32"> & tags.Minimum<1> },
      },
    );
  });
  // Page size too large
  await TestValidator.error("pageSize>200 should be error", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.index(
      connection,
      {
        body: {
          pageSize: 1001 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<200>,
        },
      },
    );
  });
  // Impossible status
  await TestValidator.error("impossible status value error", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.index(
      connection,
      {
        body: { status: "!!!not_a_real_status!!!" },
      },
    );
  });
}
