import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTelemedicineSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSessions";
import { IPageIHealthcarePlatformTelemedicineSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformTelemedicineSessions";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Search and retrieve a filtered, paginated list of telemedicine sessions.
 *
 * This endpoint allows a medical doctor to view only telemedicine sessions for
 * which they are the provider. Additional filtering is supported on
 * organization, department, patient, time range, and recording status, as
 * supplied in the request body. Pagination and total count accuracy are
 * enforced, and data is strictly mapped to the summary DTO type. All date/time
 * fields are returned as ISO 8601 strings using properly branded types.
 *
 * Authorization:
 *
 * - Only sessions assigned to the authenticated medical doctor (provider) are
 *   returned.
 * - Malicious attempts to filter for another provider's sessions are ignored
 *   (content is strictly scoped to the authenticated user).
 *
 * @param props - The request properties
 * @param props.medicalDoctor - Authenticated medical doctor making the request
 * @param props.body - Search, filter, and pagination parameters for session
 *   query
 * @returns A paginated summary object containing telemedicine sessions and
 *   pagination info
 * @throws {Error} If provider authentication fails or DB query errors
 */
export async function patchhealthcarePlatformMedicalDoctorTelemedicineSessions(props: {
  medicalDoctor: MedicaldoctorPayload;
  body: IHealthcarePlatformTelemedicineSessions.IRequest;
}): Promise<IPageIHealthcarePlatformTelemedicineSessions.ISummary> {
  const { medicalDoctor, body } = props;

  // Pagination handling: defaults/caps
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 50;
  // Cap values and ensure branding compliance
  const safePage = Math.max(1, Number(rawPage));
  const safeLimit = Math.max(1, Math.min(100, Number(rawLimit)));
  const skip = (safePage - 1) * safeLimit;

  // Compose appointment filter to ensure doctor's strict provider access
  const appointmentWhere = {
    provider_id: medicalDoctor.id, // Enforced: only sessions for this doctor
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        healthcare_platform_organization_id: body.organization_id,
      }),
    ...(body.department_id !== undefined &&
      body.department_id !== null && {
        healthcare_platform_department_id: body.department_id,
      }),
    ...(body.patient_user_id !== undefined &&
      body.patient_user_id !== null && {
        patient_id: body.patient_user_id,
      }),
    ...(body.appointment_id !== undefined &&
      body.appointment_id !== null && {
        id: body.appointment_id,
      }),
    deleted_at: null,
  };

  // Pre-query appointments (ensuring no leakage on provider_id)
  const appointmentRows =
    await MyGlobal.prisma.healthcare_platform_appointments.findMany({
      where: appointmentWhere,
      select: { id: true },
    });
  const appointmentIds: (string & tags.Format<"uuid">)[] = appointmentRows.map(
    (row) => row.id,
  );

  // If no appointments available, short-circuit to empty result
  if (appointmentIds.length === 0) {
    return {
      pagination: {
        current: safePage as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: safeLimit as number & tags.Type<"int32"> & tags.Minimum<0>,
        records: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
        pages: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
      },
      data: [],
    };
  }

  // Compose telemedicine session filter
  const sessionWhere: Record<string, unknown> = {
    appointment_id: { in: appointmentIds },
    ...(body.session_recorded !== undefined && {
      session_recorded: body.session_recorded,
    }),
    // Date window logic
    ...((body.session_start_from !== undefined &&
      body.session_start_from !== null) ||
    (body.session_start_to !== undefined && body.session_start_to !== null)
      ? {
          session_start: {
            ...(body.session_start_from !== undefined &&
              body.session_start_from !== null && {
                gte: body.session_start_from,
              }),
            ...(body.session_start_to !== undefined &&
              body.session_start_to !== null && {
                lte: body.session_start_to,
              }),
          },
        }
      : {}),
  };

  // Query matching records and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_telemedicine_sessions.findMany({
      where: sessionWhere,
      skip: skip,
      take: safeLimit,
      orderBy: { session_start: "desc" },
    }),
    MyGlobal.prisma.healthcare_platform_telemedicine_sessions.count({
      where: sessionWhere,
    }),
  ]);

  // Map to DTO summary, convert all dates using toISOStringSafe correctly
  const data = rows.map(
    (s): IHealthcarePlatformTelemedicineSessions.ISummary => ({
      id: s.id,
      appointment_id: s.appointment_id,
      join_link: s.join_link,
      session_start: toISOStringSafe(s.session_start),
      session_end: toISOStringSafe(s.session_end),
      provider_joined_at:
        s.provider_joined_at !== null && s.provider_joined_at !== undefined
          ? toISOStringSafe(s.provider_joined_at)
          : undefined,
      patient_joined_at:
        s.patient_joined_at !== null && s.patient_joined_at !== undefined
          ? toISOStringSafe(s.patient_joined_at)
          : undefined,
      session_recorded: s.session_recorded,
    }),
  );

  // Construct paginated response with branding enforcement
  return {
    pagination: {
      current: Number(safePage) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: Number(safeLimit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: Number(total) as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(Number(total) / Number(safeLimit)) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
