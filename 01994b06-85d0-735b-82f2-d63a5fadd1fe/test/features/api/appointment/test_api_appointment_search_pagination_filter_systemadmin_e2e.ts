import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointment";

/**
 * Validates system admin search, filter, and pagination of appointments.
 *
 * This test: (1) Registers a superuser admin (business email, full_name,
 * provider:local, provider_key, password) (2) Authenticates as that admin
 * (token auto handled) (3) Calls the appointment search endpoint with valid
 * filter/pagination payloads - Random UUIDs as provider_id, patient_id,
 * status_id, org, dept, room, equipment - Varying page and page_size in
 * valid/edge ranges - Sort and keyword (4) Verifies the results: - Output data
 * is valid - Pagination meta matches the expected values - Each appointment
 * (when filter used) contains filter field values (5) Edge cases: - Calls with
 * empty filter (broad search) - Invalid page/size values (negative/zero/large),
 * confirming error raised No custom resource creation, uses only allowed DTO
 * structure.
 */
export async function test_api_appointment_search_pagination_filter_systemadmin_e2e(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const adminEmail =
    RandomGenerator.name(2).replace(" ", ".") + "@example-company.com";
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Minimal appointment search (no filter: should succeed with pagination metadata)
  const minimalResponse =
    await api.functional.healthcarePlatform.systemAdmin.appointments.index(
      connection,
      {
        body: {} satisfies IHealthcarePlatformAppointment.IRequest,
      },
    );
  typia.assert(minimalResponse);
  TestValidator.predicate(
    "pagination structure for minimal search",
    typeof minimalResponse.pagination.current === "number" &&
      minimalResponse.pagination.limit > 0 &&
      minimalResponse.pagination.pages >= 0,
  );
  TestValidator.equals(
    "data array on minimal search",
    Array.isArray(minimalResponse.data),
    true,
  );

  // 3. Filtered search: apply random values for filter fields
  const filter: IHealthcarePlatformAppointment.IRequest = {
    provider_id: typia.random<string & tags.Format<"uuid">>(),
    patient_id: typia.random<string & tags.Format<"uuid">>(),
    status_id: typia.random<string & tags.Format<"uuid">>(),
    appointment_type: RandomGenerator.pick([
      "in-person",
      "telemedicine",
      "virtual",
      "followup",
    ] as const),
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: typia.random<string & tags.Format<"uuid">>(),
    room_id: typia.random<string & tags.Format<"uuid">>(),
    equipment_id: typia.random<string & tags.Format<"uuid">>(),
    keyword: RandomGenerator.name(2),
    sort: RandomGenerator.pick([
      "start_time:asc",
      "start_time:desc",
      "status_id:asc",
      "status_id:desc",
    ] as const),
    page: 1,
    page_size: 10,
    start_time_from: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // yesterday
    start_time_to: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // tomorrow
    end_time_from: new Date(Date.now() - 23 * 3600 * 1000).toISOString(),
    end_time_to: new Date(Date.now() + 25 * 3600 * 1000).toISOString(),
  };
  const filteredResponse =
    await api.functional.healthcarePlatform.systemAdmin.appointments.index(
      connection,
      { body: filter },
    );
  typia.assert(filteredResponse);
  // Check pagination
  TestValidator.equals(
    "filtered search pagination page = 1",
    filteredResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered search result page_size",
    filteredResponse.pagination.limit,
    10,
  );
  // If there are results, all must match the filter fields
  if (filteredResponse.data.length > 0) {
    for (const item of filteredResponse.data) {
      if (filter.provider_id !== undefined)
        TestValidator.equals(
          "provider_id",
          item.provider_id,
          filter.provider_id,
        );
      if (filter.patient_id !== undefined)
        TestValidator.equals("patient_id", item.patient_id, filter.patient_id);
      if (filter.status_id !== undefined)
        TestValidator.equals("status_id", item.status_id, filter.status_id);
      if (filter.organization_id !== undefined)
        TestValidator.equals(
          "organization_id",
          item.healthcare_platform_organization_id,
          filter.organization_id,
        );
      if (filter.department_id !== undefined)
        TestValidator.equals(
          "department_id",
          item.healthcare_platform_department_id,
          filter.department_id,
        );
      if (filter.appointment_type !== undefined)
        TestValidator.equals(
          "appointment_type",
          item.appointment_type,
          filter.appointment_type,
        );
      // If filter.keyword, ensure one of the searchable fields contains it
      if (filter.keyword !== undefined && item.title)
        TestValidator.predicate(
          "keyword search present in title",
          item.title !== undefined &&
            item.title !== null &&
            item.title.includes(filter.keyword!),
        );

      if (filter.room_id !== undefined) {
        // No direct mapping in ISummary (room?), so skip
      }
      if (filter.equipment_id !== undefined) {
        // No direct mapping in ISummary (equipment?), so skip
      }
      // Time range filter not re-asserted (server-side responsibility)
    }
  }

  // 4. Edge-case: Extreme pagination (invalid page/size)
  await TestValidator.error("invalid page number triggers error", async () => {
    await api.functional.healthcarePlatform.systemAdmin.appointments.index(
      connection,
      {
        body: { page: 0 } satisfies IHealthcarePlatformAppointment.IRequest,
      },
    );
  });
  await TestValidator.error("zero page size triggers error", async () => {
    await api.functional.healthcarePlatform.systemAdmin.appointments.index(
      connection,
      {
        body: {
          page: 1,
          page_size: 0,
        } satisfies IHealthcarePlatformAppointment.IRequest,
      },
    );
  });
  await TestValidator.error("giant page size triggers error", async () => {
    await api.functional.healthcarePlatform.systemAdmin.appointments.index(
      connection,
      {
        body: {
          page: 1,
          page_size: 1000000,
        } satisfies IHealthcarePlatformAppointment.IRequest,
      },
    );
  });
}
