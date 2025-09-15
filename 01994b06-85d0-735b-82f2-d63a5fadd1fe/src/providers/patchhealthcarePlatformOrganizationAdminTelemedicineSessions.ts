import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTelemedicineSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTelemedicineSessions";
import { IPageIHealthcarePlatformTelemedicineSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformTelemedicineSessions";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a filtered, paginated list of telemedicine sessions.
 *
 * Returns a paginated set of telemedicine session summaries matching the
 * supplied filter and pagination criteria. Enforces RBAC: Only sessions tied to
 * appointments belonging to the organization of the authenticated admin are
 * returned. Filtering is supported on department, provider, patient,
 * appointment, session record status, and session start window. Sensitive
 * details like join_link are included for authorized organization admins only.
 *
 * @param props - Request containing OrganizationadminPayload and advanced
 *   search/filter parameters
 * @returns Paginated result of telemedicine session summaries limited to the
 *   admin's organization scope
 * @throws {Error} When RBAC scope violated or if parameters are invalid
 */
export async function patchhealthcarePlatformOrganizationAdminTelemedicineSessions(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformTelemedicineSessions.IRequest;
}): Promise<IPageIHealthcarePlatformTelemedicineSessions.ISummary> {
  const { organizationAdmin, body } = props;

  // Find active org assignment for this admin user
  const assignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        assignment_status: "active",
        deleted_at: null,
      },
      select: {
        healthcare_platform_organization_id: true,
      },
    });

  if (!assignment) {
    // Not assigned to any active organization
    return {
      pagination: {
        current: Number(body.page && body.page > 0 ? body.page : 1),
        limit: Number(body.limit && body.limit > 0 ? body.limit : 50),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const organization_id = assignment.healthcare_platform_organization_id;

  // Defaults for pagination
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 50;
  const skip = (page - 1) * limit;

  // Build appointment filters for RBAC and input filters
  const appointmentFilters: Record<string, unknown> = {
    healthcare_platform_organization_id: organization_id,
  };
  if (body.department_id !== undefined && body.department_id !== null) {
    appointmentFilters["healthcare_platform_department_id"] =
      body.department_id;
  }
  if (body.provider_user_id !== undefined && body.provider_user_id !== null) {
    appointmentFilters["provider_id"] = body.provider_user_id;
  }
  if (body.patient_user_id !== undefined && body.patient_user_id !== null) {
    appointmentFilters["patient_id"] = body.patient_user_id;
  }
  if (body.appointment_id !== undefined && body.appointment_id !== null) {
    appointmentFilters["id"] = body.appointment_id;
  }

  // Build session filters for direct fields
  const sessionFilters: Record<string, unknown> = {};
  if (typeof body.session_recorded === "boolean") {
    sessionFilters["session_recorded"] = body.session_recorded;
  }
  if (
    (body.session_start_from !== undefined &&
      body.session_start_from !== null) ||
    (body.session_start_to !== undefined && body.session_start_to !== null)
  ) {
    const sessionStart: Record<string, string & tags.Format<"date-time">> = {};
    if (
      body.session_start_from !== undefined &&
      body.session_start_from !== null
    ) {
      sessionStart["gte"] = body.session_start_from;
    }
    if (body.session_start_to !== undefined && body.session_start_to !== null) {
      sessionStart["lte"] = body.session_start_to;
    }
    sessionFilters["session_start"] = sessionStart;
  }
  // Note: session_status cannot be directly filtered as it does not exist

  // Query total count for pagination
  const total =
    await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.count({
      where: {
        ...sessionFilters,
        appointment: appointmentFilters,
      },
    });

  // Query data with pagination & appointment join
  const sessions =
    await MyGlobal.prisma.healthcare_platform_telemedicine_sessions.findMany({
      where: {
        ...sessionFilters,
        appointment: appointmentFilters,
      },
      include: { appointment: true },
      orderBy: { session_start: "desc" },
      skip,
      take: limit,
    });

  // Build result array as ISummary[]
  const data: IHealthcarePlatformTelemedicineSessions.ISummary[] = sessions.map(
    (session) => {
      return {
        id: session.id,
        appointment_id: session.appointment_id,
        join_link: session.join_link,
        session_start: toISOStringSafe(session.session_start),
        session_end: toISOStringSafe(session.session_end),
        provider_joined_at:
          session.provider_joined_at != null
            ? toISOStringSafe(session.provider_joined_at)
            : undefined,
        patient_joined_at:
          session.patient_joined_at != null
            ? toISOStringSafe(session.patient_joined_at)
            : undefined,
        session_recorded: session.session_recorded,
      };
    },
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
