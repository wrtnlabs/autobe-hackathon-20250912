import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventOrganizer";

/**
 * This E2E test validates admin event organizers listing endpoint with
 * filtering and pagination.
 *
 * 1. Create an admin user
 * 2. Login as the admin
 * 3. Create several event organizers for test data
 * 4. List event organizers with various filters and validate results
 * 5. Validate pagination and sorting behavior
 */
export async function test_api_event_organizers_list_and_filter_as_admin_success(
  connection: api.IConnection,
) {
  // 1. Create initial admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: "password123hash",
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Login as admin
  const login: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: "password123hash",
      } satisfies IEventRegistrationAdmin.ILogin,
    });
  typia.assert(login);

  // 3. Create several event organizers
  const organizerCount = 5;
  const organizers: IEventRegistrationEventOrganizer[] = [];
  for (let i = 0; i < organizerCount; ++i) {
    const organizerBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: "orgpasshash",
      full_name: RandomGenerator.name(),
      phone_number: null,
      profile_picture_url: null,
      email_verified: RandomGenerator.pick([true, false]),
    } satisfies IEventRegistrationEventOrganizer.ICreate;
    const organizer =
      await api.functional.eventRegistration.admin.eventOrganizers.create(
        connection,
        {
          body: organizerBody,
        },
      );
    typia.assert(organizer);
    organizers.push(organizer);
  }

  // 4. List event organizers without filters
  const listAll =
    await api.functional.eventRegistration.admin.eventOrganizers.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEventRegistrationEventOrganizer.IRequest,
      },
    );
  typia.assert(listAll);
  TestValidator.predicate(
    "Listing contains at least all created organizers",
    listAll.pagination.records >= organizers.length,
  );

  // 5. List event organizers filtered by email_verified=true
  const listVerified =
    await api.functional.eventRegistration.admin.eventOrganizers.index(
      connection,
      {
        body: {
          email_verified: true,
          page: 1,
          limit: 10,
        } satisfies IEventRegistrationEventOrganizer.IRequest,
      },
    );
  typia.assert(listVerified);
  TestValidator.predicate(
    "All listed organizers have email_verified = true",
    listVerified.data.every((o) => o.email_verified === true),
  );

  // 6. List event organizers filtered by email of one organizer
  const sampleEmail = organizers[0].email;
  const listByEmail =
    await api.functional.eventRegistration.admin.eventOrganizers.index(
      connection,
      {
        body: {
          email: sampleEmail,
          page: 1,
          limit: 10,
        } satisfies IEventRegistrationEventOrganizer.IRequest,
      },
    );
  typia.assert(listByEmail);
  TestValidator.equals(
    "Filtered list by email includes only matching organizer",
    listByEmail.data[0].email,
    sampleEmail,
  );

  // 7. List event organizers with sorting orderBy full_name ascending
  const listByNameAsc =
    await api.functional.eventRegistration.admin.eventOrganizers.index(
      connection,
      {
        body: {
          orderBy: "full_name",
          orderDirection: "asc",
          page: 1,
          limit: 10,
        } satisfies IEventRegistrationEventOrganizer.IRequest,
      },
    );
  typia.assert(listByNameAsc);
  TestValidator.predicate(
    "Sorted by full_name ascending",
    listByNameAsc.data.every(
      (item, i, arr) => i === 0 || arr[i - 1].full_name <= item.full_name,
    ),
  );

  // 8. List event organizers sorted by created_at descending
  const listByCreatedDesc =
    await api.functional.eventRegistration.admin.eventOrganizers.index(
      connection,
      {
        body: {
          orderBy: "created_at",
          orderDirection: "desc",
          page: 1,
          limit: 10,
        } satisfies IEventRegistrationEventOrganizer.IRequest,
      },
    );
  typia.assert(listByCreatedDesc);
  TestValidator.predicate(
    "Sorted by created_at descending",
    listByCreatedDesc.data.every(
      (item, i, arr) => i === 0 || arr[i - 1].created_at >= item.created_at,
    ),
  );

  // 9. List event organizers paginated (page=1, limit=3)
  const paginatedList =
    await api.functional.eventRegistration.admin.eventOrganizers.index(
      connection,
      {
        body: {
          page: 1,
          limit: 3,
        } satisfies IEventRegistrationEventOrganizer.IRequest,
      },
    );
  typia.assert(paginatedList);
  TestValidator.equals("Pagination limit 3", paginatedList.pagination.limit, 3);
  TestValidator.equals("Current page 1", paginatedList.pagination.current, 1);
  TestValidator.predicate(
    "Records count >= created organizers",
    paginatedList.pagination.records >= organizers.length,
  );
}
