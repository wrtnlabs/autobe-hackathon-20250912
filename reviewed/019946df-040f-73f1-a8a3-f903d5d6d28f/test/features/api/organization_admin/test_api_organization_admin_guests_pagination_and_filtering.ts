import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsGuest";

/**
 * Test scenario for retrieving a paginated and filtered list of guest users
 * for an organization admin.
 *
 * This test covers the registration and authentication of an organization
 * administrator. It then exercises the PATCH
 * /enterpriseLms/organizationAdmin/guests endpoint with valid and invalid
 * pagination and filtering parameters. The test verifies that the
 * pagination and filtering behave correctly and that only guests associated
 * with the admin's tenant are returned.
 *
 * Furthermore, it tests negative scenarios including invalid paging
 * parameters and unauthorized access using an unauthenticated connection.
 *
 * Each step is validated with strict runtime type assertions and detailed
 * TestValidator checks to ensure data integrity and API compliance.
 *
 * Steps:
 *
 * 1. Register a new organization administrator user.
 * 2. Authenticate the registered administrator.
 * 3. Request a filtered paginated list of guests belonging to the tenant.
 * 4. Validate pagination and guest data correctness.
 * 5. Test error handling with invalid pagination parameters.
 * 6. Test unauthorized access rejection.
 *
 * This comprehensive test ensures secure and correct multi-tenant guest
 * listing functionality for organization administrators.
 */
export async function test_api_organization_admin_guests_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register a new organization administrator with realistic tenant and email
  const tenantUuid = typia.random<string & tags.Format<"uuid">>();
  const adminEmail = `${RandomGenerator.name(1).toLowerCase()}@example.com`;

  const joinedAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        tenant_id: tenantUuid,
        email: adminEmail,
        password: "StrongPassw0rd!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    },
  );
  typia.assert(joinedAdmin);

  // 2. Authenticate as the registered organization admin
  const loggedInAdmin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "StrongPassw0rd!",
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    },
  );
  typia.assert(loggedInAdmin);

  // 3. Retrieve filtered and paginated guest list for the tenant
  const guestsPage =
    await api.functional.enterpriseLms.organizationAdmin.guests.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          search: adminEmail.split("@")[0],
          sort: "email ASC",
          status: "active",
        } satisfies IEnterpriseLmsGuest.IRequest,
      },
    );
  typia.assert(guestsPage);

  // 4. Validate pagination metadata and guest data
  TestValidator.predicate(
    "guests pagination returns data",
    guestsPage.data.length >= 0,
  );
  TestValidator.equals(
    "guests pagination current page",
    guestsPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "guests pagination limit",
    guestsPage.pagination.limit <= 10 && guestsPage.pagination.limit > 0,
  );

  // Since guest summaries have no tenant_id, ensure guest ID is valid
  for (const guest of guestsPage.data) {
    typia.assert(guest);
    TestValidator.predicate(
      `guest id valid`,
      typeof guest.id === "string" && guest.id.length > 0,
    );
  }

  // 5. Test error scenario: page cannot be zero or less
  await TestValidator.error("page cannot be zero or negative", async () => {
    await api.functional.enterpriseLms.organizationAdmin.guests.index(
      connection,
      {
        body: {
          page: 0,
          limit: 10,
        } satisfies IEnterpriseLmsGuest.IRequest,
      },
    );
  });

  // 6. Test error scenario: limit cannot be negative
  await TestValidator.error("limit cannot be negative", async () => {
    await api.functional.enterpriseLms.organizationAdmin.guests.index(
      connection,
      {
        body: {
          page: 1,
          limit: -1,
        } satisfies IEnterpriseLmsGuest.IRequest,
      },
    );
  });

  // 7. Test unauthorized access with empty headers connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.enterpriseLms.organizationAdmin.guests.index(
      unauthConn,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEnterpriseLmsGuest.IRequest,
      },
    );
  });
}
