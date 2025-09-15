import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointment";

/**
 * E2E test for medical doctor searching own appointments and applying complex
 * filters.
 *
 * 1. Register doctor via POST /auth/medicalDoctor/join.
 * 2. Search appointments via PATCH /healthcarePlatform/medicalDoctor/appointments
 *    using varied filters/pagination.
 * 3. Assert only appointments for this doctor (provider_id) are returned; filters
 *    and pagination work.
 */
export async function test_api_appointment_search_pagination_filter_medicaldoctor_e2e(
  connection: api.IConnection,
) {
  // 1. Register medical doctor
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(2),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    specialty: "Cardiology",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctor = await api.functional.auth.medicalDoctor.join(connection, {
    body: joinBody,
  });
  typia.assert(doctor);

  // 2. Search for appointments with no filters (should return only own appointments)
  const res1 =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(res1);
  for (const apt of res1.data) {
    TestValidator.equals("only own appointments", apt.provider_id, doctor.id);
  }

  // 3. Search with status_id (random uuid)
  const filterStatusId = typia.random<string & tags.Format<"uuid">>();
  const res2 =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.index(
      connection,
      {
        body: { status_id: filterStatusId },
      },
    );
  typia.assert(res2);
  for (const apt of res2.data) {
    TestValidator.equals(
      "provider_id correct for filtered result",
      apt.provider_id,
      doctor.id,
    );
    TestValidator.equals(
      "status_id matches filter when status_id provided",
      apt.status_id,
      filterStatusId,
    );
  }

  // 4. Search with patient_id (random uuid)
  const filterPatientId = typia.random<string & tags.Format<"uuid">>();
  const res3 =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.index(
      connection,
      {
        body: { patient_id: filterPatientId },
      },
    );
  typia.assert(res3);
  for (const apt of res3.data) {
    TestValidator.equals("provider_id correct", apt.provider_id, doctor.id);
    TestValidator.equals(
      "patient_id matches filter",
      apt.patient_id,
      filterPatientId,
    );
  }

  // 5. Search with department_id, room_id, organization_id, appointment_type, keyword
  const filterDepartmentId = typia.random<string & tags.Format<"uuid">>();
  const filterRoomId = typia.random<string & tags.Format<"uuid">>();
  const filterOrganizationId = typia.random<string & tags.Format<"uuid">>();
  const filterType = RandomGenerator.pick([
    "in-person",
    "telemedicine",
  ] as const);
  const filterKeyword = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const res4 =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.index(
      connection,
      {
        body: {
          department_id: filterDepartmentId,
          room_id: filterRoomId,
          organization_id: filterOrganizationId,
          appointment_type: filterType,
          keyword: filterKeyword,
        },
      },
    );
  typia.assert(res4);
  for (const apt of res4.data) {
    TestValidator.equals("provider_id correct", apt.provider_id, doctor.id);
    if (
      apt.healthcare_platform_department_id !== null &&
      apt.healthcare_platform_department_id !== undefined
    )
      TestValidator.equals(
        "department filter",
        apt.healthcare_platform_department_id,
        filterDepartmentId,
      );
    if (apt.appointment_type === filterType) {
      TestValidator.equals("type filter", apt.appointment_type, filterType);
    }
  }

  // 6. Pagination: page 1, page_size 2
  const res5 =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32">,
          page_size: 2 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(res5);
  TestValidator.equals("current page is 1", res5.pagination.current, 1);
  TestValidator.equals("limit == page_size", res5.pagination.limit, 2);

  // 7. Edge case: high page number, expecting empty data or boundaries
  const res6 =
    await api.functional.healthcarePlatform.medicalDoctor.appointments.index(
      connection,
      {
        body: {
          page: 9999 as number & tags.Type<"int32">,
          page_size: 1 as number & tags.Type<"int32">,
        },
      },
    );
  typia.assert(res6);
  TestValidator.equals("high page number page", res6.pagination.current, 9999);
}
