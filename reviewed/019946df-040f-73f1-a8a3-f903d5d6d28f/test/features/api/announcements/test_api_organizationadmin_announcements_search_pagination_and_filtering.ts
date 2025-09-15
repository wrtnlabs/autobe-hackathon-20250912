import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnnouncement";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAnnouncement";

/**
 * This E2E test validates searching and paginating announcements by an
 * organization administrator.
 *
 * 1. Attempts to join as a new organization admin with valid tenant ID and user
 *    data, obtains auth tokens.
 * 2. Performs announcement search queries with paging and various filters using
 *    PATCH /enterpriseLms/organizationAdmin/announcements.
 * 3. Validates response pagination metadata and verifies that announcements match
 *    filter criteria.
 * 4. Tests edge cases such as no search results and unauthorized access.
 */
export async function test_api_organizationadmin_announcements_search_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Join as new organization administrator
  const tenant_id = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(2).replace(/ /g, ".").toLowerCase()}@example.com`;
  const first_name = RandomGenerator.name(1);
  const last_name = RandomGenerator.name(1);

  const admin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenant_id,
        email: email,
        password: "TestPassword123!",
        first_name: first_name,
        last_name: last_name,
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });

  typia.assert(admin);

  // Prepare multiple sample announcements by simulating realistic titles and statuses (assuming creation exists elsewhere)
  // Since creation endpoint is not available, we test search functionality assuming data exists

  // Helper: generate realistic search requests
  const buildSearchRequest = (
    overrides: Partial<IEnterpriseLmsAnnouncement.IRequest>,
  ) => {
    return {
      tenant_id: tenant_id,
      title: overrides.title ?? null,
      status: overrides.status ?? null,
      created_at_from: overrides.created_at_from ?? null,
      created_at_to: overrides.created_at_to ?? null,
      page: overrides.page ?? 1,
      limit: overrides.limit ?? 5,
      order: overrides.order ?? "desc",
    } satisfies IEnterpriseLmsAnnouncement.IRequest;
  };

  // 2. Test: Search with no filters using defaults
  const defaultSearchResult: IPageIEnterpriseLmsAnnouncement =
    await api.functional.enterpriseLms.organizationAdmin.announcements.index(
      connection,
      { body: buildSearchRequest({}) },
    );
  typia.assert(defaultSearchResult);

  TestValidator.predicate(
    "pagination.current is >= 1",
    defaultSearchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit is >= 1",
    defaultSearchResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination.records is >= 0",
    defaultSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is >= 0",
    defaultSearchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination.pages equals ceil(records / limit)",
    defaultSearchResult.pagination.pages ===
      Math.ceil(
        defaultSearchResult.pagination.records /
          defaultSearchResult.pagination.limit,
      ),
  );

  // Validate all announcements belong to the tenant
  for (const announcement of defaultSearchResult.data) {
    typia.assert(announcement);
    TestValidator.equals(
      "announcement belongs to tenant",
      announcement.tenant_id,
      tenant_id,
    );
  }

  // 3. Test: Search for announcements with a title keyword fragment
  if (defaultSearchResult.data.length > 0) {
    const someTitle = RandomGenerator.substring(
      defaultSearchResult.data[0].title || "",
    );
    if (someTitle.length > 0) {
      const titleFilteredResult =
        await api.functional.enterpriseLms.organizationAdmin.announcements.index(
          connection,
          { body: buildSearchRequest({ title: someTitle }) },
        );
      typia.assert(titleFilteredResult);

      // All results' titles should contain the search fragment (case insensitive)
      for (const announcement of titleFilteredResult.data) {
        typia.assert(announcement);
        TestValidator.predicate(
          `title contains '${someTitle}' (case insensitive)`,
          announcement.title.toLowerCase().includes(someTitle.toLowerCase()),
        );
      }
    }
  }

  // 4. Test: Search by status filter (using 'draft' or 'sent' or 'archived' from domain knowledge)
  // We pick likely statuses, but only verify type compliance and matching status if present
  const statuses = ["draft", "sent", "archived"] as const;

  for (const status of statuses) {
    const statusFilteredResult =
      await api.functional.enterpriseLms.organizationAdmin.announcements.index(
        connection,
        { body: buildSearchRequest({ status }) },
      );
    typia.assert(statusFilteredResult);

    for (const announcement of statusFilteredResult.data) {
      typia.assert(announcement);
      TestValidator.equals(
        "announcement matches status filter",
        announcement.status,
        status,
      );
    }
  }

  // 5. Test: Search by creation date range
  // Using a date range that likely includes some announcements
  const nowISO = new Date().toISOString();
  const pastDateISO = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString(); // 30 days ago

  const dateRangeResult =
    await api.functional.enterpriseLms.organizationAdmin.announcements.index(
      connection,
      {
        body: buildSearchRequest({
          created_at_from: pastDateISO,
          created_at_to: nowISO,
        }),
      },
    );
  typia.assert(dateRangeResult);

  for (const announcement of dateRangeResult.data) {
    typia.assert(announcement);
    TestValidator.predicate(
      "announcement.created_at >= created_at_from",
      announcement.created_at >= pastDateISO,
    );
    TestValidator.predicate(
      "announcement.created_at <= created_at_to",
      announcement.created_at <= nowISO,
    );
  }

  // 6. Test: Search with no matching title (should return empty data)
  const unlikelyTitle = "unlikely_search_term_1234567890";
  const emptyResult =
    await api.functional.enterpriseLms.organizationAdmin.announcements.index(
      connection,
      { body: buildSearchRequest({ title: unlikelyTitle }) },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result has records 0",
    emptyResult.pagination.records,
    0,
  );

  // 7. Test: Unauthorized access
  // Create unauthenticated connection by clearing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthenticated access should error", async () => {
    await api.functional.enterpriseLms.organizationAdmin.announcements.index(
      unauthConn,
      {
        body: buildSearchRequest({}),
      },
    );
  });
}
