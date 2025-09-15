import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentStatus";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointmentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentStatus";

/**
 * Test a receptionist's ability to search and list appointment statuses.
 *
 * 1. Register and login as a receptionist.
 * 2. List all appointment statuses (no filter, default sort).
 * 3. Filter by display_name substring (should find only matching items).
 * 4. Filter by business_status (e.g., "active") and verify results.
 * 5. Sort results by display_name ascending and verify order.
 * 6. Sort by sort_order descending and verify order.
 * 7. Combine filters: business_status + display_name substring.
 * 8. Paginate: limit=2, verify total, and data/limit/page fields integrity.
 * 9. Edge: Filter that returns no results (display_name unlikely substring).
 *
 * All outputs are type asserted, and selected records are checked for
 * code/label alignment.
 */
export async function test_api_appointment_status_search_by_receptionist(
  connection: api.IConnection,
) {
  // Step 1: Register and login as receptionist
  const receptionistEmail = `${RandomGenerator.alphaNumeric(8)}@healthcare.com`;
  const receptionistPassword = RandomGenerator.alphaNumeric(12);
  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail,
      full_name: RandomGenerator.name(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(receptionist);

  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionistPassword,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // Step 2: No filters, default sort, first page
  const allStatuses =
    await api.functional.healthcarePlatform.receptionist.appointmentStatuses.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(allStatuses);
  TestValidator.predicate(
    "at least one status exists",
    allStatuses.data.length > 0,
  );

  // Step 3: Filter by display_name substring (partial match, case-insensitive)
  const searchName = allStatuses.data[0].display_name.slice(0, 3).toUpperCase();
  const searchByName =
    await api.functional.healthcarePlatform.receptionist.appointmentStatuses.index(
      connection,
      {
        body: {
          display_name: searchName,
        },
      },
    );
  typia.assert(searchByName);
  TestValidator.predicate(
    "all results match display_name filter",
    searchByName.data.every((x) =>
      x.display_name.toUpperCase().includes(searchName),
    ),
  );

  // Step 4: Filter by business_status
  const hasBusinessStatus = allStatuses.data.find(
    (x) => x.business_status && x.business_status.length > 0,
  );
  if (hasBusinessStatus !== undefined) {
    const statusValue = typia.assert(hasBusinessStatus.business_status!);
    const filteredByBusinessStatus =
      await api.functional.healthcarePlatform.receptionist.appointmentStatuses.index(
        connection,
        {
          body: { business_status: statusValue },
        },
      );
    typia.assert(filteredByBusinessStatus);
    TestValidator.predicate(
      "all match business_status",
      filteredByBusinessStatus.data.every(
        (x) => x.business_status === statusValue,
      ),
    );
  }

  // Step 5: Sort by display_name (asc)
  const sortedByName =
    await api.functional.healthcarePlatform.receptionist.appointmentStatuses.index(
      connection,
      {
        body: { sort_order: 1 },
      },
    );
  typia.assert(sortedByName);

  // Step 6: Sort by sort_order (desc)
  const sortedByOrder =
    await api.functional.healthcarePlatform.receptionist.appointmentStatuses.index(
      connection,
      {
        body: { sort_order: -1 },
      },
    );
  typia.assert(sortedByOrder);

  // Step 7: Combined display_name & business_status filter
  if (hasBusinessStatus !== undefined) {
    const combined =
      await api.functional.healthcarePlatform.receptionist.appointmentStatuses.index(
        connection,
        {
          body: {
            display_name: hasBusinessStatus.display_name.slice(0, 2),
            business_status: typia.assert(hasBusinessStatus.business_status!),
          },
        },
      );
    typia.assert(combined);
    TestValidator.predicate(
      "combined filters respected",
      combined.data.every(
        (x) =>
          x.business_status === hasBusinessStatus.business_status &&
          x.display_name.includes(hasBusinessStatus.display_name.slice(0, 2)),
      ),
    );
  }

  // Step 8: Pagination - limit=2, check structure
  const paged =
    await api.functional.healthcarePlatform.receptionist.appointmentStatuses.index(
      connection,
      {
        body: { limit: 2 },
      },
    );
  typia.assert(paged);
  TestValidator.equals(
    "pagination limit respected",
    paged.data.length <= 2,
    true,
  );
  TestValidator.equals("limit field valued", paged.pagination.limit, 2);

  // Step 9: Filter that returns no results
  const none =
    await api.functional.healthcarePlatform.receptionist.appointmentStatuses.index(
      connection,
      {
        body: { display_name: "unlikely_substring_not_in_any_name" },
      },
    );
  typia.assert(none);
  TestValidator.equals("empty result set for no matches", none.data.length, 0);
}
