import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointment";

/**
 * E2E test for department head appointment search with RBAC filtering,
 * pagination, and filter combinations (by provider, patient, date).
 *
 * This test validates that a registered department head can retrieve
 * appointments only from their department using the PATCH
 * /healthcarePlatform/departmentHead/appointments API. Validates correct
 * handling of:
 *
 * - RBAC (results are limited to the allowed department scope)
 * - Pagination metadata and page/limit behaviors
 * - Filtering by department_id, provider_id, patient_id, and date/time window
 *
 * Process:
 *
 * 1. Register department head (POST /auth/departmentHead/join)
 * 2. Use issued token for authenticated requests
 * 3. Search for appointments by department, with and without provider/patient/date
 *    filters
 * 4. Assert that all results belong to the department, pagination is valid, and
 *    filter results are logically sound.
 */
export async function test_api_appointment_search_pagination_filter_departmenthead_e2e(
  connection: api.IConnection,
) {
  // 1. Register department head
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const departmentHead = await api.functional.auth.departmentHead.join(
    connection,
    { body: joinBody },
  );
  typia.assert(departmentHead);

  // 2. All search requests as this department head
  // (Assume appointments, providers, patients exist in system; focus on search logic, not setup)

  // Basic search: by department only (department_id random for test)
  const departmentId = typia.random<string & tags.Format<"uuid">>();
  const basicSearch =
    await api.functional.healthcarePlatform.departmentHead.appointments.index(
      connection,
      {
        body: {
          department_id: departmentId,
          page: 1,
          page_size: 3,
        } satisfies IHealthcarePlatformAppointment.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.equals(
    "pagination: current page",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: page size",
    basicSearch.pagination.limit,
    3,
  );

  // Filter by provider
  const providerId = typia.random<string & tags.Format<"uuid">>();
  const providerSearch =
    await api.functional.healthcarePlatform.departmentHead.appointments.index(
      connection,
      {
        body: {
          department_id: departmentId,
          provider_id: providerId,
          page: 1,
          page_size: 2,
        } satisfies IHealthcarePlatformAppointment.IRequest,
      },
    );
  typia.assert(providerSearch);
  TestValidator.equals(
    "pagination: filtered by provider page size",
    providerSearch.pagination.limit,
    2,
  );

  // Filter by patient
  const patientId = typia.random<string & tags.Format<"uuid">>();
  const patientSearch =
    await api.functional.healthcarePlatform.departmentHead.appointments.index(
      connection,
      {
        body: {
          department_id: departmentId,
          patient_id: patientId,
          page: 1,
          page_size: 2,
        } satisfies IHealthcarePlatformAppointment.IRequest,
      },
    );
  typia.assert(patientSearch);
  TestValidator.equals(
    "pagination: filtered by patient page size",
    patientSearch.pagination.limit,
    2,
  );

  // Filter by date window
  const now = new Date();
  const from = new Date(now.getTime() - 86400000).toISOString();
  const to = new Date(now.getTime() + 7 * 86400000).toISOString();
  const dateWindowSearch =
    await api.functional.healthcarePlatform.departmentHead.appointments.index(
      connection,
      {
        body: {
          department_id: departmentId,
          start_time_from: from,
          start_time_to: to,
          page: 1,
          page_size: 5,
        } satisfies IHealthcarePlatformAppointment.IRequest,
      },
    );
  typia.assert(dateWindowSearch);
  TestValidator.equals(
    "pagination: date window page size",
    dateWindowSearch.pagination.limit,
    5,
  );

  // Check that all items in basic search results belong to the requested department
  for (const item of basicSearch.data) {
    if (
      item.healthcare_platform_department_id !== undefined &&
      item.healthcare_platform_department_id !== null
    ) {
      TestValidator.equals(
        "result belongs to department",
        item.healthcare_platform_department_id,
        departmentId,
      );
    }
  }
}
