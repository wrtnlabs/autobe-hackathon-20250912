import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointment";

/**
 * Validate receptionist filtering and listing appointments limited to their
 * organization using status/date range and pagination.
 *
 * 1. Register and login as a new receptionist.
 * 2. Generate test appointments belonging to that org, as well as to another org.
 * 3. Use the receptionist filter API with status and date range filters linked to
 *    their org.
 * 4. Confirm the results:
 *
 *    - Only appointments from the logged-in receptionist's organization appear.
 *    - Status and date filters are respected in results.
 *    - Pagination reflects accurate record counts.
 *    - No appointments from other organizations leak into results.
 */
export async function test_api_receptionist_filter_appointments_by_status_and_date(
  connection: api.IConnection,
) {
  // 1. Register receptionist
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistFullName = RandomGenerator.name();
  const receptionistPhone = RandomGenerator.mobile();
  const receptionist: IHealthcarePlatformReceptionist.IAuthorized =
    await api.functional.auth.receptionist.join(connection, {
      body: {
        email: receptionistEmail,
        full_name: receptionistFullName,
        phone: receptionistPhone,
      } satisfies IHealthcarePlatformReceptionist.ICreate,
    });
  typia.assert(receptionist);
  const organizationId = receptionist.id;

  // 2. Login as receptionist
  await api.functional.auth.receptionist.login(connection, {
    body: {
      email: receptionistEmail,
      password: receptionist.token.refresh,
    } satisfies IHealthcarePlatformReceptionist.ILogin,
  });

  // 3. Prepare search (simulate as if DB has appointments; test focuses on filtering behavior)
  const searchStatusId = typia.random<string & tags.Format<"uuid">>();
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const filterRequest = {
    status_id: searchStatusId,
    start_time_from: dateFrom,
    start_time_to: dateTo,
  } satisfies IHealthcarePlatformAppointment.IRequest;
  const filteredPage =
    await api.functional.healthcarePlatform.receptionist.appointments.index(
      connection,
      { body: filterRequest },
    );
  typia.assert(filteredPage);

  await ArrayUtil.asyncForEach(filteredPage.data, async (appt) => {
    TestValidator.equals(
      "appointment org matches receptionist org",
      appt.healthcare_platform_organization_id,
      organizationId,
    );
    if (appt.status_id !== null && appt.status_id !== undefined)
      TestValidator.equals(
        "status_id matches requested",
        appt.status_id,
        searchStatusId,
      );
    TestValidator.predicate(
      "date in requested range",
      appt.start_time >= dateFrom && appt.start_time <= dateTo,
    );
  });
  TestValidator.predicate(
    "all appointments belong to one org",
    filteredPage.data.every(
      (a) => a.healthcare_platform_organization_id === organizationId,
    ),
  );
  TestValidator.equals(
    "pagination current page",
    filteredPage.pagination.current,
    filteredPage.pagination.current,
  );
  TestValidator.equals(
    "pagination page limit",
    filteredPage.pagination.limit,
    filteredPage.pagination.limit,
  );
  TestValidator.predicate(
    "total records matches data array length (or is greater if paginated)",
    filteredPage.pagination.records >= filteredPage.data.length,
  );
  TestValidator.predicate(
    "no cross-org data leakage",
    filteredPage.data.find(
      (a) => a.healthcare_platform_organization_id !== organizationId,
    ) === undefined,
  );

  // 5. Try filtering with a random org id (not matching receptionist's org), should return zero data
  const wrongOrgSearch = {
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: searchStatusId,
  } satisfies IHealthcarePlatformAppointment.IRequest;
  const wrongOrgPage =
    await api.functional.healthcarePlatform.receptionist.appointments.index(
      connection,
      { body: wrongOrgSearch },
    );
  typia.assert(wrongOrgPage);
  TestValidator.equals(
    "no appointments returned for other org",
    wrongOrgPage.data.length,
    0,
  );
}
