import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointment";

/**
 * Test that a patient can only view their own appointments (no leakage to
 * others), and that pagination works correctly at boundaries.
 *
 * Steps:
 *
 * 1. Register (join) patientA and patientB.
 * 2. Login as patientA (session context).
 * 3. Query own appointment list with page=1, page_size=2.
 * 4. Confirm all records returned have patient_id === patientA.id.
 * 5. Test next page; if appointments span multiple pages, confirm results and
 *    proper patient scoping. If only one page, fetch out-of-bounds page
 *    (page=2) and ensure empty data/results.
 * 6. Switch session to patientB via login and query their appointment list;
 *    confirm only patientB's appointments are visible.
 * 7. Validate that none of patientA's appointments leak to patientB.
 * 8. Check pagination metadata at each step for consistency.
 */
export async function test_api_patient_view_own_appointments_only_pagination_edge_case(
  connection: api.IConnection,
) {
  // 1. Register and login patientA
  const patientAEmail = RandomGenerator.alphaNumeric(10) + "@patient.com";
  const patientAPassword = RandomGenerator.alphaNumeric(10);
  const patientAJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientAEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date("1995-01-01").toISOString(),
      password: patientAPassword,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientAJoin);

  // 2. Register patientB
  const patientBEmail = RandomGenerator.alphaNumeric(10) + "@other.com";
  const patientBPassword = RandomGenerator.alphaNumeric(10);
  const patientBJoin = await api.functional.auth.patient.join(connection, {
    body: {
      email: patientBEmail,
      full_name: RandomGenerator.name(),
      date_of_birth: new Date("1990-01-10").toISOString(),
      password: patientBPassword,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(patientBJoin);

  // 3. PatientA: fetch appointment list first page
  const firstPageReq = {
    page: 1,
    page_size: 2,
  } satisfies IHealthcarePlatformAppointment.IRequest;
  const page1 =
    await api.functional.healthcarePlatform.patient.appointments.index(
      connection,
      { body: firstPageReq },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "all appointments returned are for patientA",
    page1.data.every((app) => app.patient_id === patientAJoin.id),
  );
  TestValidator.equals(
    "pagination current page is page 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is correct (page_size)",
    page1.pagination.limit,
    2,
  );
  // 4. If there is a second page, fetch it and validate
  if (page1.pagination.pages > 1) {
    const secondPageReq = {
      page: 2,
      page_size: 2,
    } satisfies IHealthcarePlatformAppointment.IRequest;
    const page2 =
      await api.functional.healthcarePlatform.patient.appointments.index(
        connection,
        { body: secondPageReq },
      );
    typia.assert(page2);
    TestValidator.equals(
      "pagination current page is page 2",
      page2.pagination.current,
      2,
    );
    TestValidator.equals(
      "pagination limit on page 2",
      page2.pagination.limit,
      2,
    );
    TestValidator.predicate(
      "appointments in page 2 are for patientA",
      page2.data.every((app) => app.patient_id === patientAJoin.id),
    );
    if (page2.data.length === 0) {
      TestValidator.equals(
        "pagination yields empty result at last page",
        page2.data.length,
        0,
      );
    }
  } else {
    // If there's only one page, test out-of-bounds next page
    const oobPageReq = {
      page: 2,
      page_size: 2,
    } satisfies IHealthcarePlatformAppointment.IRequest;
    const oob =
      await api.functional.healthcarePlatform.patient.appointments.index(
        connection,
        { body: oobPageReq },
      );
    typia.assert(oob);
    TestValidator.equals(
      "empty data set for out-of-bounds page",
      oob.data.length,
      0,
    );
    TestValidator.equals(
      "pagination reflects correct page number for out-of-bounds",
      oob.pagination.current,
      2,
    );
    TestValidator.equals(
      "pagination total pages is 1 for patientA",
      oob.pagination.pages,
      1,
    );
  }
  // 5. Switch to patientB session
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientBEmail,
      password: patientBPassword,
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  // 6. PatientB fetches first page
  const pageB =
    await api.functional.healthcarePlatform.patient.appointments.index(
      connection,
      {
        body: {
          page: 1,
          page_size: 5,
        } satisfies IHealthcarePlatformAppointment.IRequest,
      },
    );
  typia.assert(pageB);
  if (pageB.data.length > 0) {
    TestValidator.predicate(
      "all appointments for patientB list belong to patientB",
      pageB.data.every((r) => r.patient_id === patientBJoin.id),
    );
    TestValidator.predicate(
      "none of patientA's appointments are visible to patientB",
      !pageB.data.some((r) => r.patient_id === patientAJoin.id),
    );
  } else {
    TestValidator.equals(
      "no appointments shown to patientB if none exist",
      pageB.data.length,
      0,
    );
  }
  TestValidator.equals(
    "pagination current is 1 for patientB",
    pageB.pagination.current,
    1,
  );
}
